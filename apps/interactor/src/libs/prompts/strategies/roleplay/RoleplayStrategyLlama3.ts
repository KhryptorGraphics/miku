import { EMPTY_MIKU_CARD } from '@mikugg/bot-utils';
import { selectCurrentScene } from '../../../../state/selectors';
import { RootState } from '../../../../state/store';
import { AbstractRoleplayStrategy } from './AbstractRoleplayStrategy';

export class RoleplayStrategyLlama3 extends AbstractRoleplayStrategy {
  protected override getContextPrompt(state: RootState, currentCharacterId: string): string {
    const scene = selectCurrentScene(state);
    const characters = scene?.characters || [];
    const characterTemplates = characters
      .filter(({ characterId }) => characterId !== currentCharacterId)
      .map(({ characterId }) => `{{${characterId}}}`);
    const { persona, attributes, sampleChat } = this.getCharacterSpecs(
      state.novel.characters.find(({ id }) => id === currentCharacterId)?.card || EMPTY_MIKU_CARD,
    );
    const formattedAttributes = attributes
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_key, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    const emotions = this.getCharacterEmotions(state, currentCharacterId);
    const emotionStrings = emotions.join(', ');

    let template = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\nYou are an expert actor that can fully immerse yourself into any role given. You do not break character for any reason, even if someone tries addressing you as an AI or language model.
    Currently your role is {{char}}, which is described in detail below. As {{char}}, continue the exchange with ${
      characterTemplates.length ? characterTemplates.join(', ') + ' and ' : ''
    }{{user}}.`;
    template += `\nAvoid repetition, don't loop. Develop the plot slowly, always stay in character. Describe all actions in full, elaborate, explicit, graphic, and vivid detail. Mention all relevant sensory perceptions.`;
    template += `\nDO NOT describe {{user}}'s actions or dialogues, ONLY describe {{char}}'s actions and dialogue.`;
    template += `\nYou must also indicate {{char}}'s reaction in the response.`;
    template += `\nYou MUST not repeat the same reaction too many times.`;
    template += `\nThe reaction MUST be one of: ${emotionStrings}.`;
    if (persona || formattedAttributes) {
      template += `<|eot_id|><|start_header_id|>user<|end_header_id|>\n${persona}\n${formattedAttributes}\n`;
    }

    if (state.settings.prompt.systemPrompt) {
      template += `${state.settings.prompt.systemPrompt}\n`;
    }

    const lorebook = this.getContextForLorebookEntry(state, currentCharacterId);

    if (sampleChat.length || lorebook) {
      template += `\nThis is how {{char}} should talk:\n`;
      for (const example of sampleChat) {
        template += example + '\n';
      }
      if (lorebook) {
        template += `${lorebook}\n`;
      }
    }

    template += `\nThen the roleplay chat between ${[...characterTemplates, '{{user}}'].join(
      ', ',
    )} and {{char}} begins.\n\n`;

    if (scene?.prompt) {
      template += `\nSCENE: ${scene.prompt}\n`;
    }

    scene?.characters.forEach((char) => {
      if (char.objective) {
        template += `\n{{${char.characterId}}}'s OBJECTIVE: ${char.objective}\n`;
      }
    });

    return template;
  }

  public override template() {
    return {
      askLine:
        '<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n# Reaction + 2 paragraphs, engaging, natural, authentic, descriptive, creative.\n',
      instruction: '<|eot_id|><|start_header_id|>user<|end_header_id|>\n',
      response: '<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n',
      stops: ['###'],
    };
  }
}
