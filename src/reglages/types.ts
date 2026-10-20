/** Le compte du joueur, tel que le jeu le connaît sur cet appareil. */
export type SettingsAccount =
  /** Connecté : son code (ou `null` s'il n'est pas gardé ici), la déconnexion, et l'état de la sauvegarde en ligne. */
  | { status: "connected"; code: string | null; onSignOut: () => void; syncLine?: string }
  /** Pas encore de compte sur cet appareil. */
  | { status: "signed-out"; onCreate: () => void; onSignIn: () => void }
  /** Le jeu n'a pas d'API configurée (développement) : la section n'est pas montrée. */
  | { status: "unavailable" };

/** Les notifications de cet appareil. */
export type SettingsNotifications = {
  /** `install-first` : sur iPhone, il faut d'abord ajouter le jeu à l'écran d'accueil. */
  support: "ok" | "install-first" | "unsupported";
  enabled: boolean;
  busy?: boolean;
  error?: string | null;
  onEnable: () => void;
  onDisable: () => void;
};

/** La sauvegarde à emporter : le jeu fournit le texte et sa lecture, le kit fait le reste. */
export type SettingsSave = {
  /** Le texte de la sauvegarde (code ou JSON), calculé à l'ouverture du dialogue. */
  exportText: () => string;
  /** Nom du fichier enregistré (ex. « lou-2026-10-20.txt »). */
  fileName: () => string;
  /** Lit un texte importé : le message d'erreur à afficher, ou le nom de ce qu'il contient et de quoi l'appliquer. */
  parse: (text: string) => { error: string } | { name: string; apply: () => void };
  /** Début attendu du texte, montré en exemple (ex. « PETLIFE1.… »). */
  placeholder?: string;
};

/** Recommencer de zéro : la phrase de confirmation propre au jeu, et l'action. */
export type SettingsRestart = { text: string; onConfirm: () => void };
