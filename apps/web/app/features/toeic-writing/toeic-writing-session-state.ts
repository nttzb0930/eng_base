export type ToeicWritingSaveStatus = "IDLE" | "SAVING" | "SAVED" | "ERROR";

export type ToeicWritingSessionState = {
  responseText: string;
  saveStatus: ToeicWritingSaveStatus;
  submitting: boolean;
  hydrated: boolean;
  dirty: boolean;
};

export const initialToeicWritingSessionState: ToeicWritingSessionState = {
  responseText: "",
  saveStatus: "IDLE",
  submitting: false,
  hydrated: false,
  dirty: false,
};

export type ToeicWritingSessionAction =
  | { type: "hydrate"; value: string }
  | { type: "edit"; value: string }
  | { type: "saving" }
  | { type: "saved" }
  | { type: "save-failed" }
  | { type: "submitting" }
  | { type: "submit-failed" };

export function reduceWritingSession(
  state: ToeicWritingSessionState,
  action: ToeicWritingSessionAction
): ToeicWritingSessionState {
  switch (action.type) {
    case "hydrate":
      return state.dirty || state.hydrated
        ? state
        : {
            ...state,
            responseText: action.value,
            hydrated: true,
            saveStatus: action.value ? "SAVED" : "IDLE",
          };
    case "edit":
      return {
        ...state,
        responseText: action.value,
        saveStatus: "IDLE",
        dirty: true,
      };
    case "saving":
      return { ...state, saveStatus: "SAVING" };
    case "saved":
      return { ...state, saveStatus: "SAVED" };
    case "save-failed":
      return { ...state, saveStatus: "ERROR" };
    case "submitting":
      return { ...state, submitting: true };
    case "submit-failed":
      return { ...state, submitting: false };
  }
}
