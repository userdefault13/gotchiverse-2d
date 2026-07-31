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
  const streamKind = parsed.ok ? parsed.kind : undefined;

  const fallbackTitle = (() => {
    if (embedUrl && !watching) return 'Player hidden';
    if (streamKind === 'broadcast') return 'Broadcast ready';
    if (streamKind === 'spaces') return 'Spaces ready';
    return 'Embed unavailable';
  })();

  const fallbackHint = (() => {
    if (embedUrl && !watching) return 'Show the player again, or open the stream on X.';
    if (streamKind === 'broadcast' || streamKind === 'spaces') {
      return 'X blocks in-game playback for live broadcasts and Spaces. Open on X to watch.';
    }
    return 'X often blocks iframes for this link type. Use Open on X.';
  })();

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

  const openOnX = () => {
    click();
    if (watchUrl) window.open(watchUrl, '_blank', 'noopener,noreferrer');
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
                <Button size={2} onClick={openOnX}>
                  Open on X
                </Button>
              ) : null}
            </div>
          </div>

          {isOwner ? (
            <div className="broadcaster-config">
              <p className="broadcaster-meta">
                Paste an X status/video tweet URL to embed in-game, or a broadcast / Spaces URL to open on X.
              </p>
              <input
                className="broadcaster-input"
                type="url"
                placeholder="https://x.com/…/status/… or /i/broadcasts/…"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
              />
              <div className="broadcaster-actions">
                <Button size={2} onClick={saveUrl}>
                  Save stream
                </Button>
                {embedUrl ? (
                  <Button
                    size={2}
                    onClick={() => {
                      click();
                      setWatching((v) => !v);
                    }}
                  >
                    {watching ? 'Hide player' : 'Show player'}
                  </Button>
                ) : null}
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
            <div className="broadcaster-player">
              <iframe
                key={embedUrl}
                title="X live stream"
                src={embedUrl}
                className="broadcaster-iframe"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className={`broadcaster-nosignal ${!embedUrl ? 'broadcaster-nosignal--cta' : ''}`}>
              <p>{fallbackTitle}</p>
              <p className="broadcaster-meta">{fallbackHint}</p>
              {watchUrl ? (
                <Button size={2} onClick={openOnX}>
                  Watch on X
                </Button>
              ) : null}
              {!embedUrl && streamKind === 'broadcast' ? (
                <p className="broadcaster-meta broadcaster-tip">
                  Tip: for in-TV playback, paste a tweet status URL that contains the video
                  (x.com/…/status/123…). Broadcast links only open on X.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
