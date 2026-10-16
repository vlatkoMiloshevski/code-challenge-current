// Stand-ins for the Ionic components in unit tests. The tests check logic, not Ionic's rendering,
// and the real package cannot be loaded by Jest (its icon dependency is an ES module with exports Jest does not resolve).
// Components under test override their imports, so these only need to exist as named exports.

class IonStub {}

export const IonApp = IonStub;
export const IonBadge = IonStub;
export const IonButton = IonStub;
export const IonCheckbox = IonStub;
export const IonContent = IonStub;
export const IonHeader = IonStub;
export const IonIcon = IonStub;
export const IonItem = IonStub;
export const IonLabel = IonStub;
export const IonList = IonStub;
export const IonListHeader = IonStub;
export const IonModal = IonStub;
export const IonNote = IonStub;
export const IonRouterOutlet = IonStub;
export const IonSearchbar = IonStub;
export const IonSpinner = IonStub;
export const IonText = IonStub;
export const IonTitle = IonStub;
export const IonToggle = IonStub;
export const IonToolbar = IonStub;
