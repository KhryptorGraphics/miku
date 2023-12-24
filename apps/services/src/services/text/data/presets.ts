import { OpenAIAphroditeConfig } from "../lib/aphroditeTokenGenerator";

export enum PresetType {
  DIVINE_INTELECT = "DIVINE_INTELECT",
  LLAMA_PRECISE = "LLAMA_PRECISE",
}

//truncation_length: 4096,

export const presets = new Map<PresetType, OpenAIAphroditeConfig>([
  [
    PresetType.DIVINE_INTELECT,
    {
      n: 1,
      best_of: 1,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
      repetition_penalty: 1.17,
      temperature: 1.31,
      top_p: 0.14,
      top_k: 49,
      top_a: 0.52,
      tfs: 1,
      eta_cutoff: 10.42,
      epsilon_cutoff: 1.49,
      typical_p: 1,
      mirostat_mode: 0,
      mirostat_tau: 5.0,
      mirostat_eta: 0.1,
      use_beam_search: false,
      length_penalty: 1.0,
      early_stopping: false,
      stop: ["\n###", "</s>", "<|", "\n#", "\n\n\n"],
      ignore_eos: false,
      skip_special_tokens: true,
      spaces_between_special_tokens: true,
    },
  ],
  [
    PresetType.LLAMA_PRECISE,
    {
      n: 1,
      best_of: 1,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
      repetition_penalty: 1.18,
      temperature: 0.7,
      top_p: 0.1,
      top_k: 40,
      top_a: 0,
      tfs: 1,
      eta_cutoff: 0,
      epsilon_cutoff: 0,
      typical_p: 1,
      mirostat_mode: 0,
      mirostat_tau: 5.0,
      mirostat_eta: 0.1,
      use_beam_search: false,
      length_penalty: 1.0,
      early_stopping: false,
      stop: ["\n###", "</s>", "<|", "\n#", "\n\n\n"],
      ignore_eos: false,
      skip_special_tokens: true,
      spaces_between_special_tokens: true,
    },
  ],
]);
