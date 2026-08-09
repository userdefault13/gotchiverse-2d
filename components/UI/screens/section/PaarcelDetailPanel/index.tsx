import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import styles from './styles';
import {
  InstallationThumbnail,
  PaarcelThumbnail,
  SoftCText,
  formatParcelDisplayName,
} from 'components/UI/widgets';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useWeb3 } from 'contexts/Web3Context';
import { paarcelSizeCssVars, type CPaarcel } from 'helpers/cartridgePaarcel.helper';
import { getParcelAccessRights } from 'helpers/parcels.helper';
import { ParcelAccessRights, ParcelAccessValues } from 'types';
import { PARCELS_BY_TOKEN_ID } from 'shared_code/models/model.realm';

interface Props {
  parcel: CPaarcel;
  onBack: () => void;
}

const ACCESS_ACTIONS: Array<{ key: keyof ParcelAccessRights; label: string }> = [
  { key: 'channel', label: 'Channeling' },
  { key: 'emptyReservoir', label: 'Emptying Reservoir' },
  { key: 'equipInstallations', label: 'Equipping Installations' },
  { key: 'equipTiles', label: 'Equipping Tiles' },
  { key: 'updateInstallations', label: 'Upgrading Installations' },
];

const accessLabel = (value: number | undefined): string => {
  switch (value) {
    case ParcelAccessValues.OnlyMe:
      return 'Only owner';
    case ParcelAccessValues.MeAndBorrowedGotchis:
      return 'Owner & borrowed';
    case ParcelAccessValues.Whitelist:
      return 'Whitelist only';
    case ParcelAccessValues.Banlist:
      return 'Banlist';
    case ParcelAccessValues.Anyone:
      return 'Anyone';
    default:
      return '—';
  }
};

export const PaarcelDetailPanel = ({ parcel, onBack }: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const [{ currentNetwork, globalProvider }] = useWeb3();
  const [accessRights, setAccessRights] = useState<ParcelAccessRights | null>(null);
  const [accessStatus, setAccessStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');

  const realmTokenId = String(parcel.realmTokenId || '').trim();
  const meta =
    PARCELS_BY_TOKEN_ID[realmTokenId] || PARCELS_BY_TOKEN_ID[Number(realmTokenId)] || undefined;
  const displayName = formatParcelDisplayName(
    String(meta?.parcelHash || parcel.parcelId || realmTokenId),
  );
  const sizeLabel = String(parcel.size || meta?.size || 'humble').trim() || 'humble';
  const district = Number(parcel.district ?? meta?.district) || 0;
  const toneStyle = useMemo(() => paarcelSizeCssVars(sizeLabel) as CSSProperties, [sizeLabel]);

  const installs = useMemo(() => parcel.installations || [], [parcel.installations]);
  const installCount = installs.filter((i) => i.kind !== 'tile').length;
  const tileCount = installs.filter((i) => i.kind === 'tile').length;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!/^\d+$/.test(realmTokenId) || !currentNetwork || !globalProvider) {
        setAccessRights(null);
        setAccessStatus('idle');
        return;
      }
      setAccessStatus('loading');
      try {
        const net = (currentNetwork === 'robinhood' || currentNetwork === 'bitcoin') ? 'base' : currentNetwork;
        const rights = await getParcelAccessRights([realmTokenId], net, globalProvider);
        if (cancelled) return;
        setAccessRights(rights[0] || null);
        setAccessStatus('ready');
      } catch (e) {
        console.warn('@PaarcelDetailPanel access rights', e);
        if (cancelled) return;
        setAccessRights(null);
        setAccessStatus('error');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [realmTokenId, currentNetwork, globalProvider]);

  return (
    <>
      <div className="paarcel-detail-panel">
        <h2 className="panel-title">
          <SoftCText>cPaarcel</SoftCText> details
        </h2>
        <div className="toolbar">
          <button
            type="button"
            className="back-btn"
            onClick={() => {
              click();
              onBack();
            }}
          >
            ← Back to mint
          </button>
        </div>

        <div className="scroll-body">
          <section className="section">
            <h3 className="section-title">Parcel details</h3>
            <div className="hero">
              <PaarcelThumbnail
                realmTokenId={realmTokenId}
                name={displayName}
                size={96}
                parcelSize={sizeLabel}
              />
              <div className="hero-meta">
                <h4 className="hero-name">{displayName}</h4>
                <p className="hero-line">
                  <em>District</em>
                  {district || '—'}
                </p>
                <p className="hero-line">
                  <em>Token ID</em>
                  {realmTokenId || '—'}
                </p>
                <p className="hero-line">
                  <em>Parcel ID</em>
                  {parcel.parcelId || meta?.parcelId || '—'}
                </p>
                <span className="size-pill" style={toneStyle}>
                  {sizeLabel}
                </span>
              </div>
            </div>
          </section>

          <section className="section">
            <h3 className="section-title">Installation summary</h3>
            {installs.length === 0 ? (
              <p className="empty-note">No installations minted on this cPaarcel yet.</p>
            ) : (
              <div className="install-list">
                {installs.map((inst, idx) => (
                  <div key={inst.id || `${inst.itemTypeId}-${idx}`} className="install-row">
                    <InstallationThumbnail
                      itemTypeId={inst.itemTypeId}
                      kind={inst.kind === 'tile' ? 'tile' : 'installation'}
                      name={inst.name}
                      size={40}
                      tinted
                    />
                    <div className="install-meta">
                      <span className="install-name">{inst.name || `#${inst.itemTypeId}`}</span>
                      <span className="install-sub">
                        {inst.kind === 'tile' ? 'Tile' : 'Installation'} · ID {inst.itemTypeId}
                        {inst.x != null && inst.y != null ? ` · (${inst.x}, ${inst.y})` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="section">
            <h3 className="section-title">Permissions</h3>
            {accessStatus === 'loading' ? (
              <p className="empty-note">Loading on-chain access rights…</p>
            ) : accessStatus === 'error' ? (
              <p className="empty-note">Could not load access rights for this parcel.</p>
            ) : accessStatus === 'idle' ? (
              <p className="empty-note">Connect wallet to load access rights.</p>
            ) : (
              <div className="perm-list">
                {ACCESS_ACTIONS.map((action) => (
                  <div key={action.key} className="perm-row">
                    <span className="perm-label">{action.label}</span>
                    <span className="perm-value">{accessLabel(accessRights?.[action.key])}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="section">
            <h3 className="section-title">Breakdown</h3>
            <div className="breakdown-grid">
              <div className="stat-card">
                <span className="stat-label">Size</span>
                <span className="stat-value">{sizeLabel}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Installs</span>
                <span className="stat-value">{installCount}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Tiles</span>
                <span className="stat-value">{tileCount}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total equipped</span>
                <span className="stat-value">{installs.length}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
