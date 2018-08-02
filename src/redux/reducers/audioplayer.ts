import { camelizeKeys } from 'humps';
import { handle } from 'redux-pack';
import { buildAudioForVerse } from '../../helpers/buildAudio';
import { buildSegments } from '../../helpers/buildSegments';

import {
  SET_CURRENT_FILE,
  SET_CURRENT_WORD,
  SET_CURRENT_VERSE,
  PLAY_CURRENT_WORD,
  PLAY,
  PAUSE,
  SET_REPEAT,
  TOGGLE_SCROLL,
  UPDATE,
  FETCH_AUDIOPLAYER,
} from '../constants/audioplayer';

type RepeatType = {
  from: $TsFixMe;
  to: $TsFixMe;
  times: number;
};

type State = {
  files: $TsFixMe;
  currentFile?: $TsFixMe;
  currentVerse?: string;
  currentWord?: $TsFixMe;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  repeat: RepeatType;
  shouldScroll: boolean;
  isLoading: boolean;
  segments: $TsFixMe;
};

export const INITIAL_STATE: State = {
  files: {},

  currentVerse: null,
  currentWord: null,
  currentTime: 0,
  duration: 1,
  isPlaying: false,
  repeat: {
    from: undefined,
    to: undefined,
    times: Infinity,
  },
  shouldScroll: true,
  isLoading: true,
  segments: {},
};

export default (state = INITIAL_STATE, action: $TsFixMe) => {
  switch (action.type) {
    // case VERSES_CLEAR_CURRENT: {
    //   const stateFilesCurrent = state.files;

    //   return {
    //     ...state,
    //     files: {
    //       ...stateFilesCurrent,
    //       [action.id]: {},
    //     },
    //   };
    // }
    case FETCH_AUDIOPLAYER: {
      return handle(state, action, {
        success: prevState => {
          const audioFile: $TsFixMe = camelizeKeys(action.payload.audio_file);

          return {
            ...prevState,
            loaded: true,
            loading: false,
            errored: false,
            files: {
              ...state.files,
              [action.meta.chapterId]: {
                ...state.files[action.meta.chapterId],
                [action.meta.verseKey]: buildAudioForVerse(
                  audioFile,
                  action.meta.isCurrentVerse && 'auto'
                ).audio,
              },
            },
            segments: {
              ...state.segments,
              [action.meta.chapterId]: {
                ...state.segments[action.meta.chapterId],
                [action.meta.verseKey]: buildSegments(audioFile.segments),
              },
            },
            ...(action.meta.isCurrentVerse
              ? { currentVerse: action.meta.verseKey }
              : {}),
          };
        },
      });
    }
    case UPDATE: {
      const { payload } = action;

      return {
        ...state,
        ...payload,
      };
    }
    case PLAY: {
      const { payload } = action;

      if (payload) {
        return {
          ...state,
          isPlaying: true,
          currentVerse: payload,
        };
      }

      return {
        ...state,
        isPlaying: true,
      };
    }
    case PAUSE: {
      return {
        ...state,
        isPlaying: false,
      };
    }
    case SET_REPEAT: {
      const { repeat } = action;

      return {
        ...state,
        repeat,
      };
    }
    case TOGGLE_SCROLL: {
      return {
        ...state,
        shouldScroll: !state.shouldScroll,
      };
    }
    case SET_CURRENT_FILE: {
      return {
        ...state,
      };
    }
    case SET_CURRENT_WORD: {
      if (!action.word) return state;

      const [chapterId, ayahNum, word] = action.word.split(':');
      const nextId = `${chapterId}:${ayahNum}`;
      let currentTime = null;

      if (!state.segments[chapterId][nextId]) return state;

      if (state.files[chapterId][nextId] === state.currentFile) {
        // When the files are the same, set the current time to that word
        currentTime = state.segments[chapterId][nextId].words[word].startTime;
        state.currentFile.currentTime = currentTime; // eslint-disable-line no-param-reassign

        return {
          ...state,
          currentWord: action.word,
          currentTime,
        };
      }

      // When the files are not the same.
      const currentFile = state.files[chapterId][nextId];
      const segment = buildSegments(state.segments[chapterId][nextId]);

      currentTime = segment.words[word].startTime;
      currentFile.currentTime = currentTime;

      const stateSegments = state.segments;
      const stateSegmentsId = state.segments[chapterId];

      return {
        ...state,
        currentWord: action.word,
        currentVerse: nextId,
        isPlaying: false,
        currentTime,
        currentFile,
        segments: {
          ...stateSegments,
          [chapterId]: {
            ...stateSegmentsId,
            [nextId]: segment,
          },
        },
      };
    }
    case PLAY_CURRENT_WORD: {
      if (!action.payload) return state;

      const { word, position } = action.payload;
      const [chapterId, ayahNum] = word.verseKey.split(':');
      const nextId = `${chapterId}:${ayahNum}`;
      const currentFile = state.files[chapterId][nextId];

      if (!state.segments[chapterId][nextId].words[position]) return state;

      const currentTime =
        state.segments[chapterId][nextId].words[position].startTime;

      const { endTime } = state.segments[chapterId][nextId].words[position];
      currentFile.currentTime = currentTime;

      const int = setInterval(() => {
        if (currentFile.currentTime > endTime) {
          currentFile.pause();
          clearInterval(int);
        }
      }, 10);
      currentFile.play();

      return {
        ...state,
        currentWord: word,
      };
    }
    case SET_CURRENT_VERSE: {
      return {
        ...state,
        currentVerse: action.payload,
        isPlaying: action.meta.shouldPlay,
      };
    }
    default: {
      return state;
    }
  }
};