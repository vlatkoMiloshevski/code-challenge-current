import { StationDetailDto, StationDto } from '../app/core/api/station-api.dto';
import { Station } from '../app/core/models/station.model';

export function makeStation(overrides: Partial<Station> = {}): Station {
  return {
    id: 1,
    name: 'Station 1',
    address: 'Test street 1',
    postCode: '0150',
    town: 'Oslo',
    country: 'Norway',
    latitude: 59.91,
    longitude: 10.75,
    operatorName: 'Operator',
    operatorLogoUrl: '',
    type: 'Public',
    isOpen: true,
    isActive: true,
    isFavorite: false,
    distance: 0,
    power: { minKwh: 7.4, maxKwh: 22.2 },
    boxes: { total: 2, available: 1, occupied: 1, offline: 0 },
    connectors: [{ type: { id: 9, name: 'CCS2', iconName: 'ccs2', category: 33 }, amount: 2, available: 1 }],
    ...overrides,
  };
}

export function makeStationDto(overrides: Partial<StationDto> = {}): StationDto {
  return {
    PK_ChargingStationID: 1,
    Name: 'Station 1',
    Address: 'Test street 1',
    PostCode: '0150',
    Town: 'Oslo',
    StateOrProvince: 'Oslo',
    Country: 'Norway',
    Latitude: 59.91,
    Longitude: 10.75,
    kWhMin: 7.4,
    kWhMax: 22.2,
    Distance: 0,
    IsOpen: true,
    IsActive: true,
    IsFavorite: false,
    availableBoxes: 1,
    occupiedBoxes: 1,
    offlineBoxes: 0,
    totalBoxes: 2,
    Connectors: [
      { PK_CPConnectorTypeID: 9, Name: 'CCS2', IconName: 'ccs2', ConnectorType: 33, Amount: 2, Available: 1 },
    ],
    OperatorName: 'Operator',
    OperatorLogoURL: '',
    ChargingStationType: 'Public',
    ...overrides,
  };
}

export function makeStationDetailDto(overrides: Partial<StationDetailDto> = {}): StationDetailDto {
  return {
    Currency: 'NOK',
    OwnedByCompanyName: 'Owner AS',
    IsFavorite: false,
    IsOpen: true,
    ChargingPoints: [
      {
        PK_ChargePointID: 10,
        Name: 'Point A',
        ChargerCode: 'A-1',
        IsActive: true,
        IsOpen: true,
        IsFavorite: false,
        CurrentStatus: 'Available',
        MaxKWH: 22,
        MaxKW: 22,
        Volts: 400,
        ConnectorTypes: [{ PK_CPConnectorTypeID: 9, Name: 'CCS2', IconName: 'ccs2', ConnectorType: 33 }],
      },
    ],
    Summary: {
      PricingNow: {
        Type_Cost_Charging: 'kWh',
        ChargingCostKWH: 3.5,
        CostPriceVATPercentage: 25,
        StartupCostPrice: 10,
        Currency: 'NOK',
      },
    },
    SupportInformation: {
      PhoneNumberString: '+47 000 00 000',
      SupportEmail: 'support@example.com',
      SupportWebsite: 'https://example.com',
      SupportCustomerServiceURL: 'https://example.com/help',
    },
    ...overrides,
  };
}
