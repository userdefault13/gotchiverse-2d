import { chatWindowSendIcon } from 'assets';
import { useState, useEffect, useRef, useReducer } from 'react';
import styles from './styles';
import Image from 'next/image';
import { usePhaser } from 'contexts/PhaserContext';
import { ChatBubble, ChatMessage } from './ChatBubble';
import { EventMessage, ServerMessage } from './EventMessage';
import { useChat } from 'contexts/ChatContext';
import { handleChatEvent, postChatMessage, subscribeToChatChannel, updateGotchiImgs } from 'contexts/ChatContext/actions';
import { useRealm } from 'contexts/RealmContext';
import { ChatEvent, ChatRoomEvent } from 'types';
import { getAarcadeDiscordConnectUrl, getIsValidated } from 'helpers/auth.helper';
import _ from 'lodash';
import { useGame } from 'contexts/GameContext';
import { useWeb3 } from 'contexts/Web3Context';

interface Props {
  channel: 'LOCAL' | 'GLOBAL';
  open: boolean;
}

export const ChatWindow = ({ channel, open }: Props): JSX.Element => {
  const [, dispatch] = usePhaser();
  const [{ localChatEvents, globalChatEvents, gotchiImgs }, chatDispatch] = useChat();
  const [{ selectedPlayer, currentDistrict, isAavegotchiLent }] = useRealm();
  const [{ gameConfig }] = useGame();
  const [{ currentAccount }] = useWeb3();
  const aarcadeConnectUrl = getAarcadeDiscordConnectUrl(currentAccount);

  const [messageValue, setMessageValue] = useState('');
  const [localChatHistory, setLocalChatHistory] = useState<Array<ServerMessage | ChatMessage>>([]);
  const [globalChatHistory, setGlobalHistory] = useState<Array<ServerMessage | ChatMessage>>([]);

  const [isInitiated, initiate] = useReducer(() => true, false);

  const valueRef = useRef<string>('');
  const verifiedRef = useRef<boolean | undefined>();
  const localScrollRef = useRef<HTMLDivElement>(null);
  const globalScrollRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef(null);

  const setFocused = (value: boolean) => {
    dispatch({
      type: 'UPDATE_DISABLE_KEYBOARD',
      disableKeyboard: value,
    });
  };

  const submitMessage = () => {
    if (valueRef.current) {
      if (verifiedRef.current) {
        const message = valueRef.current;
        postChatMessage(message);
      } else {
        const serverMessage: ChatRoomEvent = {
          type: 'SERVER',
          message: (
            <p style={{ color: 'var(--col-grey)', margin: 0 }}>
              You must be the owner of this Aavegotchi or{' '}
              <a href={aarcadeConnectUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--col-info-400)' }}>
                Connect Discord on Aarcade
              </a>{' '}
              before you can post in chat.
            </p>
          ),
          channel: channel.toLowerCase() as 'local' | 'global',
          time: new Date().valueOf(),
        };
        handleChatEvent(serverMessage, chatDispatch);
      }
      setMessageValue('');
    }
  };

  const scrollToBottom = (chat: 'LOCAL' | 'GLOBAL') => {
    const ref = chat === 'LOCAL' ? localScrollRef : globalScrollRef;
    const { scrollTop, scrollHeight, offsetHeight } = ref.current;
    const scrollDif = scrollHeight - (offsetHeight + scrollTop);
    if (scrollDif < 100 || scrollTop === 0) {
      ref.current.scroll({ top: scrollHeight });
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  const parseEvents = (events: Array<ChatEvent | ChatRoomEvent>, chatChannel: 'LOCAL' | 'GLOBAL') => {
    const history = events.reduce((acc: Array<ServerMessage | ChatMessage>, curr) => {
      if (curr.type === 'USER') {
        const prevMessage = acc.length ? acc[acc.length - 1] : undefined;
        const isUserMessage = 'from' in prevMessage;

        if (isUserMessage && (prevMessage as ChatMessage).from === curr.name) {
          const newHistory = [...acc];
          const updatedMessage = newHistory[newHistory.length - 1] as ChatMessage;
          updatedMessage.message = [...updatedMessage.message, curr.message];
          return newHistory;
        } else {
          const message: ChatMessage = {
            from: curr.name,
            background: '#d3cdcd',
            message: [curr.message],
            date: new Date(curr.time),
            isSender: selectedPlayer?.id === curr.id,
            gotchiId: curr.id,
          };
          return [...acc, message];
        }
      } else {
        const message: ServerMessage = {
          message: curr.message,
          date: new Date(curr.time),
        };
        return [...acc, message];
      }
    }, []);

    chatChannel === 'LOCAL' ? setLocalChatHistory(history) : setGlobalHistory(history);
  };

  const filterGotchiIds = (events: Array<ChatEvent | ChatRoomEvent>) => {
    return events.reduce((acc, curr) => {
      if (curr.type === 'USER') {
        return [...acc, curr.id];
      } else {
        return acc;
      }
    }, []);
  };

  const handleEventUpdate = (events: Array<ChatEvent | ChatRoomEvent>, chatChannel: 'LOCAL' | 'GLOBAL') => {
    if (events.length) {
      parseEvents(events, chatChannel);
      void updateGotchiImgs(filterGotchiIds(events), _.values(gotchiImgs), chatDispatch);
    } else {
      // chatChannel === "LOCAL" ? se
      // setChatHistory([]);
    }
  };

  const handleConnection = (channel: 'LOCAL' | 'GLOBAL', district?: number) => {
    subscribeToChatChannel(channel);
    const serverMessage: ChatRoomEvent = {
      type: 'SERVER',
      message: `Connected to ${district && channel === 'LOCAL' ? `DISTRICT ${district}` : channel} chat room.`,
      channel: channel.toLowerCase() as 'local' | 'global',
      time: new Date().valueOf(),
    };
    handleChatEvent(serverMessage, chatDispatch);
  };

  const checkCanChat = async (address: string, borrowed: boolean) => {
    if (!address) {
      verifiedRef.current = false;
    } else if (!borrowed) {
      verifiedRef.current = true;
    } else {
      const res = await getIsValidated(address);
      verifiedRef.current = res;
    }
  };

  useEffect(() => {
    void checkCanChat(selectedPlayer?.owner, isAavegotchiLent);
  }, [selectedPlayer?.owner, isAavegotchiLent]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (valueRef.current !== messageValue) {
      valueRef.current = messageValue;
    }
  }, [messageValue]);

  useEffect(() => {
    handleEventUpdate(channel === 'LOCAL' ? localChatEvents : globalChatEvents, channel);
  }, [localChatEvents, globalChatEvents, channel]);

  useEffect(() => {
    if (isInitiated && channel === 'GLOBAL') {
      handleConnection(channel);
    }
  }, [channel, isInitiated]);

  useEffect(() => {
    if (channel === 'LOCAL' && currentDistrict && isInitiated) {
      handleConnection(channel, currentDistrict);
    }
  }, [currentDistrict, channel, isInitiated]);

  useEffect(() => {
    scrollToBottom(channel);
  }, [localChatHistory, globalChatHistory]);

  useEffect(() => {
    if (open) {
      initiate();
      focusRef.current.focus();
    } else {
      focusRef.current.blur();
    }
  }, [open]);

  return (
    <>
      <div className={gameConfig.gotchiverseTheme}>
        {channel === 'LOCAL' && (
          <div className={`scrollable ${gameConfig.gotchiverseTheme}`} ref={localScrollRef}>
            {localChatHistory.map((data, i) => {
              const isUserMessage = 'from' in data;
              if (isUserMessage) {
                return (
                  <div key={i}>
                    <ChatBubble {...data} img={gotchiImgs[data.gotchiId]?.img} />
                  </div>
                );
              } else {
                return (
                  <div key={i}>
                    <EventMessage {...data} />
                  </div>
                );
              }
            })}
          </div>
        )}
        {channel === 'GLOBAL' && (
          <div className={`scrollable ${gameConfig.gotchiverseTheme}`} ref={globalScrollRef}>
            {globalChatHistory.map((data, i) => {
              const isUserMessage = 'from' in data;
              if (isUserMessage) {
                return (
                  <div key={i}>
                    <ChatBubble {...data} img={gotchiImgs[data.gotchiId]?.img} />
                  </div>
                );
              } else {
                return (
                  <div key={i}>
                    <EventMessage {...data} />
                  </div>
                );
              }
            })}
          </div>
        )}
        <div className="chat-input-container">
          <textarea
            maxLength={500}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => setMessageValue(e.currentTarget.value)}
            value={messageValue}
            ref={focusRef}
          />
          <button className="clickable" onClick={submitMessage}>
            <Image alt="" src={chatWindowSendIcon} width={20} height={20} />
          </button>
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
