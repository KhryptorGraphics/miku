import { GiFallingStar } from 'react-icons/gi';
import { useSwipeable } from 'react-swipeable';
import './SceneSuggestion.scss';
import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { useAppDispatch, useAppSelector } from '../../state/store';
import {
  endInferencingScene,
  selectCharacter,
  setBackground,
  setModalOpened,
  setMusic,
  setPromptValue,
  startInferencingScene,
} from '../../state/slices/creationSlice';
import { Button, Input, Loader, Modal, Tooltip } from '@mikugg/ui-kit';
import { TbPlayerTrackNextFilled } from 'react-icons/tb';
import { interactionStart, sceneSuggestionsStart } from '../../state/slices/narrationSlice';
import { useAppContext } from '../../App.context';
import { userDataFetchStart } from '../../state/slices/settingsSlice';
import { NarrationSceneSuggestion } from '../../state/versioning/v3.state';
import { selectCurrentNextScene, selectCurrentScene } from '../../state/selectors';
import { trackEvent } from '../../libs/analytics';
import { BackgroundResult, SearchType, SongResult, listSearch } from '../../libs/listSearch';
import trim from 'lodash.trim';
import { addScene } from '../../state/slices/novelSlice';
import { BsStars } from 'react-icons/bs';
import { CustomEventType, postMessage } from '../../libs/stateEvents';
import { spendSceneSuggestion } from '../../libs/platformAPI';

export default function SceneSuggestion() {
  const [buttonOpened, setButtonOpened] = useState<boolean>(false);
  const { servicesEndpoint, apiEndpoint } = useAppContext();
  const dispatch = useAppDispatch();
  const { suggestedScenes, fetchingSuggestions, shouldSuggestScenes } = useAppSelector(
    (state) => state.narration.responses[state.narration.currentResponseId]!,
  );
  const { disabled } = useAppSelector((state) => state.narration.input);
  const nextSceneId = useAppSelector(selectCurrentNextScene);
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      setButtonOpened(false);
    },
  });

  const nextScene = useAppSelector((state) => state.novel.scenes.find((s) => s.id === nextSceneId));

  useEffect(() => {
    if (shouldSuggestScenes || nextScene) {
      setButtonOpened(true);
    } else {
      setButtonOpened(false);
    }
  }, [shouldSuggestScenes, nextScene]);

  return (
    <>
      <div className={classNames('SceneSuggestion', !buttonOpened ? 'SceneSuggestion--button-hidden' : '')}>
        <div className="SceneSuggestion__button-container">
          {!disabled && nextScene ? (
            <button
              {...swipeHandlers}
              className="SceneSuggestion__button"
              onClick={async () => {
                dispatch(
                  setModalOpened({
                    id: 'scene-preview',
                    opened: true,
                    itemId: nextScene.id,
                  }),
                );
                trackEvent('scene-advance-suggestion-click');
              }}
            >
              <div className="SceneSuggestion__text">
                <span>Go to next scene</span>
              </div>
              <TbPlayerTrackNextFilled />
            </button>
          ) : !disabled && shouldSuggestScenes ? (
            <button
              {...swipeHandlers}
              className="SceneSuggestion__button"
              onClick={async () => {
                dispatch(
                  setModalOpened({
                    id: 'scene-suggestions',
                    opened: true,
                  }),
                );
                if (!fetchingSuggestions && !suggestedScenes.length) {
                  dispatch(sceneSuggestionsStart({ servicesEndpoint }));
                  dispatch(userDataFetchStart({ apiEndpoint }));
                }
                trackEvent('scene-generate-suggestion-click');
              }}
            >
              <div className="SceneSuggestion__text">
                <span>Generate next scene</span>
              </div>
              <GiFallingStar />
            </button>
          ) : null}
        </div>
      </div>
      <SceneSuggestionModal />
    </>
  );
}

const SceneSuggestionModal = () => {
  const { assetLinkLoader } = useAppContext();
  const dispatch = useAppDispatch();
  const { opened } = useAppSelector((state) => state.creation.scene.sceneSugestions);
  const currentScene = useAppSelector(selectCurrentScene);
  const currentMusic = useAppSelector((state) => state.novel.songs.find(({ id }) => id === currentScene?.musicId));
  const { suggestedScenes, fetchingSuggestions } = useAppSelector(
    (state) => state.narration.responses[state.narration.currentResponseId]!,
  );
  const lastSuggestedIndex = !fetchingSuggestions
    ? suggestedScenes.length
    : [...suggestedScenes, { actionText: '' }].findIndex((suggestion) => {
        return !suggestion.actionText.length;
      }) - 1;
  const { apiEndpoint, servicesEndpoint } = useAppContext();
  const fetchingScene = useAppSelector((state) => state.creation.scene.sceneSugestions.inferencing);
  const [promptForSuggestion, setPromptForSuggestion] = useState<string>('');
  const currentBackground = useAppSelector((state) =>
    state.novel.backgrounds.find(({ id }) => id === currentScene?.backgroundId),
  );
  const { isPremium, sceneSuggestionsLeft } = useAppSelector((state) => state.settings.user);
  const [loadingEditIndex, setLoadingEditIndex] = useState<number>(-1);

  const loadSceneData = async (
    sceneSuggestion: NarrationSceneSuggestion,
  ): Promise<{
    music: SongResult | null;
    background: BackgroundResult | null;
  }> => {
    const music = sceneSuggestion?.music
      ? await listSearch<SongResult>(apiEndpoint, SearchType.SONG_VECTOR, {
          search: trim(sceneSuggestion?.music),
          take: 1,
          skip: 0,
        })
          .then((result) => (result.length ? result[0] : null))
          .catch((e) => {
            console.error(e);
            return null;
          })
      : null;
    const background = sceneSuggestion?.sdPrompt
      ? await listSearch<BackgroundResult>(apiEndpoint, SearchType.BACKGROUND_VECTOR, {
          search: trim(sceneSuggestion?.sdPrompt),
          take: 1,
          skip: 0,
        })
          .then((result) => (result.length ? result[0] : null))
          .catch((e) => {
            console.error(e);
            return null;
          })
      : null;

    return { music, background };
  };

  const prefillScene = async (sceneSuggestion: NarrationSceneSuggestion, index: number) => {
    setLoadingEditIndex(index);
    const { music, background } = await loadSceneData(sceneSuggestion);
    dispatch(setBackground(background?.asset || currentBackground?.source?.jpg || ''));
    dispatch(
      setMusic({
        name: music?.title || currentScene?.musicId || '',
        source: assetLinkLoader(music?.asset || currentMusic?.source || '') || currentScene?.musicId || '',
      }),
    );
    dispatch(
      setPromptValue(`OOC: Describe the following scene and add dialogue: ${sceneSuggestion?.textPrompt || ''}`),
    );
    currentScene?.characters.forEach((c, index) => {
      dispatch(
        selectCharacter({
          index: index,
          id: c.characterId,
          outfit: c.outfit,
        }),
      );
    });
    dispatch(setModalOpened({ id: 'slidepanel', opened: true }));
    dispatch(setModalOpened({ id: 'scene', opened: true }));
    dispatch(setModalOpened({ id: 'scene-suggestions', opened: false }));
    await spendSceneSuggestion(apiEndpoint);
    setLoadingEditIndex(-1);
    dispatch(userDataFetchStart({ apiEndpoint }));
  };

  const generateScene = async (sceneSuggestion: NarrationSceneSuggestion) => {
    dispatch(startInferencingScene());
    const { music, background } = await loadSceneData(sceneSuggestion);
    dispatch(
      addScene({
        id: sceneSuggestion.sceneId,
        characters:
          currentScene?.characters.map((c) => ({
            id: c.characterId,
            outfit: c.outfit,
          })) || [],
        background: background?.asset || currentBackground?.source?.jpg || '',
        music: music?.asset || currentScene?.musicId || '',
        name: sceneSuggestion?.actionText || '',
        prompt: sceneSuggestion?.textPrompt || '',
        children: currentScene?.children || [],
      }),
    );

    dispatch(
      interactionStart({
        sceneId: sceneSuggestion.sceneId,
        text: `OOC: Describe the following scene and add dialogue: ${sceneSuggestion?.textPrompt || ''}`,
        characters: sceneSuggestion?.characters.map((r) => r.characterId) || [],
        servicesEndpoint,
        apiEndpoint,
        selectedCharacterId:
          sceneSuggestion?.characters[Math.floor(Math.random() * (sceneSuggestion?.characters.length || 0))]
            .characterId || '',
      }),
    );
    dispatch(
      setModalOpened({
        id: 'scene-suggestions',
        opened: false,
      }),
    );
    dispatch(setModalOpened({ id: 'scene', opened: false }));
    dispatch(setModalOpened({ id: 'slidepanel', opened: false }));
    dispatch(endInferencingScene());
    await spendSceneSuggestion(apiEndpoint);
    trackEvent('scene-generate-successful');
    dispatch(userDataFetchStart({ apiEndpoint }));
  };

  return (
    <Modal
      opened={opened}
      onCloseModal={() => {
        dispatch(
          setModalOpened({
            id: 'scene-suggestions',
            opened: false,
          }),
        );
      }}
      shouldCloseOnOverlayClick={!fetchingScene}
    >
      <div className="SceneSuggestionModal">
        <div className="SceneSuggestionModal__header">
          <h2>Scene suggestions</h2>
          {!isPremium ? (
            <div className="SceneSuggestionModal__countdown">
              <div className="SceneSuggestionModal__countdown-amount">
                {sceneSuggestionsLeft} scene generations left today.
              </div>
              <div className="SceneSuggestionModal__countdown-upgrade">
                <Button
                  theme="transparent"
                  data-tooltip-id="upgrade-tooltip"
                  data-tooltip-content="Get premium for unlimited scene generations."
                  onClick={() => postMessage(CustomEventType.OPEN_PREMIUM, null)}
                >
                  Upgrade
                </Button>
                <Tooltip id="upgrade-tooltip" place="bottom" />
              </div>
            </div>
          ) : null}
        </div>
        <div className="SceneSuggestionModal__content">
          {!fetchingSuggestions && !suggestedScenes.length ? (
            <div className="SceneSuggestionModal__options">
              <div className="SceneSuggestionModal__suggest">
                <Button
                  theme="gradient"
                  onClick={() => {
                    dispatch(sceneSuggestionsStart({ servicesEndpoint }));
                    dispatch(userDataFetchStart({ apiEndpoint }));
                  }}
                >
                  Suggest 3 scenes
                </Button>
              </div>
              <div className="SceneSuggestionModal__single-suggest">
                <div className="SceneSuggestionModal__single-suggest-text">
                  or describe the new scene in your own words
                </div>
                <div className="SceneSuggestionModal__single-suggest-field">
                  <Input value={promptForSuggestion} onChange={(e) => setPromptForSuggestion(e.target.value)} />
                  <Button
                    theme="secondary"
                    onClick={() => {
                      dispatch(
                        sceneSuggestionsStart({
                          servicesEndpoint,
                          singleScenePrompt: promptForSuggestion,
                        }),
                      );
                      dispatch(userDataFetchStart({ apiEndpoint }));
                    }}
                    disabled={!promptForSuggestion}
                  >
                    <BsStars />
                    {''}
                    Generate
                  </Button>
                </div>
              </div>
            </div>
          ) : fetchingScene ? (
            <div className="SceneSuggestionModal__loading">
              <Loader />
              Generating scene...
            </div>
          ) : fetchingSuggestions && !suggestedScenes.length ? (
            <div className="SceneSuggestionModal__loading">
              <Loader />
              Fetching suggestions...
            </div>
          ) : (
            <div className="SceneSuggestionModal__suggestions">
              {suggestedScenes.map((suggestion, index) => {
                const loading = index >= lastSuggestedIndex;
                return (
                  <div key={index} className="SceneSuggestionModal__suggestion">
                    <div className="SceneSuggestionModal__suggestion-header">
                      <h3>{suggestion.actionText}</h3>
                    </div>
                    <div className="SceneSuggestionModal__suggestion-prompt scrollbar">
                      <p>{suggestion.textPrompt}</p>
                    </div>
                    <div className="SceneSuggestionModal__suggestion-button">
                      {!loading && (sceneSuggestionsLeft || isPremium) ? (
                        <Button
                          onClick={async () => {
                            if (sceneSuggestionsLeft || isPremium) {
                              prefillScene(suggestion, index);
                            }
                          }}
                          theme="transparent"
                          disabled={loadingEditIndex === index}
                        >
                          {loadingEditIndex === index ? <Loader /> : 'Edit'}
                        </Button>
                      ) : null}
                      <Button
                        theme="gradient"
                        disabled={loading || (!sceneSuggestionsLeft && !isPremium)}
                        onClick={() => (sceneSuggestionsLeft || isPremium) && generateScene(suggestion)}
                      >
                        {loading ? <Loader /> : 'Go to scene'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
