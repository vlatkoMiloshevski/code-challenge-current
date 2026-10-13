// Domain models used by the UI. These are independent of the API field names.

export type StationType = 'AppartmentBuilding' | 'PrivateParking' | 'HomeCharger' | 'Public'; // | 'Other';

/** Normalized charge point status. Unknown API values map to 'Unknown'. */
export type ChargePointStatus = 'Available' | 'Preparing'; // | 'Occupied' | 'Offline' | 'Unknown';

export interface ConnectorType {
  id: number;
  name: string;
  iconName: string;
  /** Numeric connector category from the API (e.g. 25 = Type 2, 40 = CHAdeMO). */
  category: number;
}

export interface StationConnector {
  type: ConnectorType;
  /** Total number of connectors of this type at the station. */
  amount: number;
  available: number;
}

export interface Station {
  id: number;
  name: string;
  address: string;
  postCode: string;
  town: string;
  country: string;
  latitude: number;
  longitude: number;
  operatorName: string;
  operatorLogoUrl: string;
  type: StationType;
  isOpen: boolean;
  isActive: boolean;
  isFavorite: boolean;
  /** Distance as delivered by the API. The unit is not documented; verify before displaying. */
  distance: number;
  power: { minKwh: number; maxKwh: number };
  boxes: { total: number; available: number; occupied: number; offline: number };
  connectors: StationConnector[];
}

export interface ChargePoint {
  id: number;
  name: string;
  chargerCode: string;
  isActive: boolean;
  isOpen: boolean;
  isFavorite: boolean;
  status: ChargePointStatus;
  maxKw: number;
  volts: number;
  connectorTypes: ConnectorType[];
}

export interface Pricing {
  currency: string;
  costPerKwh: number;
  startupCost: number;
  vatPercent: number;
  pricingType: string;
}

export interface SupportInfo {
  phone: string;
  email: string;
  website: string;
  customerServiceUrl: string;
}

/**
 * Full station details. Identity and status fields come from the list endpoint,
 * the detail endpoint adds charge points, pricing and support information.
 */
export interface StationDetail extends Station {
  ownerName: string;
  pricing: Pricing | null;
  support: SupportInfo | null;
  chargePoints: ChargePoint[];
}
