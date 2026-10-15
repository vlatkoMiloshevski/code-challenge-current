
export interface ConnectorTypeDto {
  PK_CPConnectorTypeID: number;
  Name: string;
  IconName: string;
  ConnectorType: number;
}

export interface StationConnectorDto extends ConnectorTypeDto {
  Amount: number;
  Available: number;
}

export interface StationDto {
  PK_ChargingStationID: number;
  Name: string;
  Address: string;
  PostCode: string;
  Town: string;
  StateOrProvince: string;
  Country: string;
  Latitude: number;
  Longitude: number;
  kWhMin: number;
  kWhMax: number;
  Distance: number;
  IsOpen: boolean;
  IsActive: boolean;
  IsFavorite: boolean;
  availableBoxes: number;
  occupiedBoxes: number;
  offlineBoxes: number;
  totalBoxes: number;
  Connectors: StationConnectorDto[];
  OperatorName: string;
  OperatorLogoURL: string;
  ChargingStationType: string;
}

export interface StationListResponseDto {
  Result: StationDto[];
}

export interface ChargePointDto {
  PK_ChargePointID: number;
  Name: string;
  ChargerCode: string;
  IsActive: boolean;
  IsOpen: boolean;
  IsFavorite: boolean;
  CurrentStatus: string;
  MaxKWH: number;
  MaxKW: number;
  Volts: number;
  ConnectorTypes: ConnectorTypeDto[];
}

export interface StationDetailDto {
  Currency: string;
  OwnedByCompanyName: string;
  IsFavorite: boolean;
  IsOpen: boolean;
  ChargingPoints: ChargePointDto[];
  Summary: {
    PricingNow: {
      Type_Cost_Charging: string;
      ChargingCostKWH: number;
      CostPriceVATPercentage: number;
      StartupCostPrice: number;
      Currency: string;
    };
  };
  SupportInformation: {
    PhoneNumberString: string;
    SupportEmail: string;
    SupportWebsite: string;
    SupportCustomerServiceURL: string;
  };
}

export interface StationDetailResponseDto {
  Result: StationDetailDto;
}
