import styles from './styles';
import type { ReactNode } from 'react';

interface Props {
  text: ReactNode;
  secondaryText?: string;
  style: 'left' | 'centered' | 'right' | 'simple-right-line' | 'bottom-line-two-side';
  color?: string;
}

export const StyledTitle = ({ text, secondaryText, style, color = '' }: Props): JSX.Element => {
  return (
    <>
      {style === 'left' && (
        <div className="header-section">
          <div className="heading">{text}</div>
          <div className="diag-line-wrapper">
            <div className="diag-line"></div>
          </div>
          <div className="bottom-line"></div>
        </div>
      )}
      {style === 'centered' && (
        <div className={`title-section ${color}`}>
          <div className="outline-left">
            <span className="bottom-line"></span>
            <span className="diag"></span>
            <span className="top-line"></span>
          </div>
          <h3 className={`title ${color}`}>{text}</h3>
          <div className="outline-right">
            <span className="top-line"></span>
            <span className="anti-diag"></span>
            <span className="bottom-line"></span>
          </div>
        </div>
      )}
      {style === 'right' && (
        <div className="title-container-right">
          <div className="title-right">
            <span>{text}</span>
            <br />
            <span className="flex-grow"> {secondaryText}</span>
          </div>
          <div className="styled-line">
            <div className="bottom-line"></div>
            <div className="diag-line"></div>
            <div className="top-line"></div>
          </div>
        </div>
      )}
      {style === 'simple-right-line' && (
        <div className="simple-right-line">
          <div className="title">{text}</div>
          <div className="mid-line"></div>
        </div>
      )}
      {style === 'bottom-line-two-side' && (
        <div className="bottom-line-two-side">
          <div className="left-bottom-line" />
          <div className={`title ${color}`}>{text}</div>
          <div className="right-bottom-line" />
        </div>
      )}
      <style jsx>{styles}</style>
    </>
  );
};
