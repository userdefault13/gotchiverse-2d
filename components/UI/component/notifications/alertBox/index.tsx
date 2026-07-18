import styles from './styles';
import { SuccessIcon, InfoIcon, ErrorIcon, WarningIcon } from 'assets/icons';
import { Notification } from 'types';
import Image from 'next/image';
import { Loader } from '../../../elements/loader';
import { PopupIcon } from 'components/UI/elements';

interface Props extends Omit<Notification, 'type'> {
  type: 'success' | 'info' | 'pending' | 'error' | 'warning';
  icon?: string;
  href?: string;
  handleClick?: () => void;
  /** Open href in a new tab (default true when href is set). */
  openInNewTab?: boolean;
}

export const AlertBox = ({ type, title, message, icon, href, handleClick, openInNewTab = true }: Props): JSX.Element => {
  const renderIcon = () => {
    switch (type) {
      case 'info':
        return InfoIcon;
      case 'success':
        return SuccessIcon;
      case 'error':
        return ErrorIcon;
      case 'warning':
        return WarningIcon;
    }
  };

  const openHref = () => {
    if (!href) return;
    if (openInNewTab) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      window.location.assign(href);
    }
  };

  const onActivate = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (handleClick) {
      handleClick();
      return;
    }
    openHref();
  };

  return (
    <>
      <div
        className={`toast-container ${type} ${(href || handleClick) ? 'clickable' : ''}`}
        onClick={href || handleClick ? onActivate : undefined}
        onKeyDown={(e) => {
          if (!(href || handleClick)) return;
          if (e.key === 'Enter' || e.key === ' ') onActivate();
        }}
        role={href || handleClick ? 'link' : undefined}
        tabIndex={href || handleClick ? 0 : undefined}
      >
        <div className="toast-inner">
          {type === 'pending' ? <Loader size={0.3} /> : <Image alt="" src={icon || renderIcon()} height={32} width={32} />}
          <div className="content-container">
            {(href || handleClick) && (
              <div className="flex items-center gap-2">
                <a
                  className="title"
                  href={href || '#'}
                  target={openInNewTab ? '_blank' : undefined}
                  rel={openInNewTab ? 'noreferrer' : undefined}
                  onClick={onActivate}
                >
                  {title}
                </a>
                <PopupIcon />
              </div>
            )}
            {!href && !handleClick && <p className="title">{title}</p>}
            <p className="message">{message}</p>
          </div>
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
