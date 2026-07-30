import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { SoftCText } from 'components/UI/widgets';
import { useUI } from 'contexts/UIContexts';
import InputController from 'components/controllers/inputController';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { parseXStreamUrl } from 'helpers/broadcaster.installation.helper';
import {
  loadLodgeLayout,
  serializeLodgeLayout,
  setBroadcasterStreamUrl,
} from 'helpers/lodge.layout.helper';
import { publishLodgeLayout } from 'helpers/colyseus.lodge';
import { applyLodgeSceneLayout } from 'helpers/lodge.scene.helper';
import styles from './styles';

export const BroadcasterModal = (): JSX.Element => {
  const [{ broadcasterState, lodgeState }, uiDispatch] = useUI();
  const { click, back } = useAavegotchiSound();
  const [draftUrl, setDraftUrl] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [watching, setWatching] = useState(true);

  const open = Boolean(broadcasterState?.open);
  const furnitureId = broadcasterState?.furnitureId;
  const lodgeId = broadcasterState?.lodgeId || lodgeState?.installationId;
  const isOwner = Boolean(broadcasterState?.isOwner);
  const streamUrl = String(broadcasterState?.streamUrl || '');

  const parsed = useMemo(() => parseXStreamUrl(streamUrl), [streamUrl]);
  const embedUrl = parsed.ok ? parsed.embedUrl || '' : '';
  const watchUrl = parsed.ok ? parsed.watchUrl || streamUrl : streamUrl;

  useEffect(() => {
    if (!open) return;
    setDraftUrl(streamUrl);
    setStatusMsg(null);
    setWatching(true);
    InputController.updateDisableKeyboard(true);
  }, [open, streamUrl, furnitureId]);

  const close = () => {
    back();
    uiDispatch({
      type: 'UPDATE_BROADCASTER_MODAL',
      broadcasterState: {
        open: false,
        furnitureId: undefined,
        lodgeId: undefined,
        streamUrl: undefined,
        isOwner: false,
      },
    });
    if (!lodgeState?.open) {
      InputController.updateDisableKeyboard(false);
    }
  };

  const saveUrl = () => {
    if (!isOwner || !furnitureId || !lodgeId) return;
    click();
    const check = parseXStreamUrl(draftUrl);
    if (String(draftUrl || '').trim() && !check.ok) {
      setStatusMsg(check.message);
      return;
    }
    const layout = loadLodgeLayout(lodgeId);
    const result = setBroadcasterStreamUrl(layout, furnitureId, draftUrl);
    setStatusMsg(result.message);
    if (!result.ok) return;
    applyLodgeSceneLayout(result.layout);
    publishLodgeLayout(serializeLodgeLayout(result.layout));
    uiDispatch({
      type: 'UPDATE_BROADCASTER_MODAL',
      broadcasterState: {
        ...broadcasterState,
        open: true,
        streamUrl: result.layout.furniture.find((f) => f.id === furnitureId)?.streamUrl || '',
      },
    });
  };

  return (
    <>
      <Modal title="Broadcaster" open={open} onClose={close} light>
        <div className={`broadcaster-modal ${watching && embedUrl ? 'watching' : ''}`}>
          <style jsx>{styles}</style>
          <div className="broadcaster-header">
            <div className="broadcaster-title">
              <SoftCText>TV Live</SoftCText>
            </div>
            <div className="broadcaster-actions">
              {watchUrl ? (
                <Button
                  size={2}
                  onClick={() => {
                    click();
                    window.open(watchUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  Open on X
                </Button>
              ) : null}
            </div>
          </div>

          {isOwner ? (
            <div className="broadcaster-config">
              <p className="broadcaster-meta">Paste an X live / broadcast / Spaces URL for visitors.</p>
              <input
                className="broadcaster-input"
                type="url"
                placeholder="https://x.com/i/broadcasts/…"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
              />
              <div className="broadcaster-actions">
                <Button size={2} onClick={saveUrl}>
                  Save stream
                </Button>
                <Button
                  size={2}
                  onClick={() => {
                    click();
                    setWatching((v) => !v);
                  }}
                >
                  {watching ? 'Hide player' : 'Show player'}
                </Button>
              </div>
              {statusMsg ? <p className="broadcaster-meta">{statusMsg}</p> : null}
            </div>
          ) : null}

          {!streamUrl ? (
            <div className="broadcaster-nosignal">
              <p>No signal</p>
              <p className="broadcaster-meta">
                {isOwner ? 'Set an X stream URL above.' : 'The lodge owner has not tuned this TV yet.'}
              </p>
            </div>
          ) : watching && embedUrl ? (
            <iframe
              key={embedUrl}
              title="X live stream"
              src={embedUrl}
              className="broadcaster-iframe"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="broadcaster-nosignal">
              <p>{embedUrl ? 'Player hidden' : 'Embed unavailable'}</p>
              <p className="broadcaster-meta">
                X often blocks iframes for Spaces / live. Use Open on X.
              </p>
              {watchUrl ? (
                <Button
                  size={2}
                  onClick={() => {
                    click();
                    window.open(watchUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  Watch on X
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
