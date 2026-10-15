
export type StationType = 'AppartmentBuilding' | 'PrivateParking' | 'HomeCharger' | 'Public';
export type ChargePointStatus = 'Available' | 'Preparing';
export type MarkerConnector = 'CCS2' | 'Type - 2' | 'CHAdeMO';

export interface ConnectorType {
  id: number;
  name: string;
  iconName: string;
  category: number;
}

export interface StationConnector {
  type: ConnectorType;
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
  connectors: ConnectorType[];
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

export interface StationDetail extends Station {
  ownerName: string;
  pricing: Pricing | null;
  support: SupportInfo | null;
  chargePoints: ChargePoint[];
}
