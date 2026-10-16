import {
  ChargePointDto,
  ConnectorTypeDto,
  StationConnectorDto,
  StationDetailDto,
  StationDto,
} from '../api/station-api.dto';
import { ChargePoint, ConnectorType, Station, StationConnector, StationDetail } from '../models/station.model';

export function mapConnectorType(dto: ConnectorTypeDto): ConnectorType {
  return {
    id: dto.PK_CPConnectorTypeID,
    name: dto.Name,
    iconName: dto.IconName,
    category: dto.ConnectorType,
  };
}

export function mapStationConnector(dto: StationConnectorDto): StationConnector {
  return {
    type: mapConnectorType(dto),
    amount: dto.Amount,
    available: dto.Available,
  };
}

export function mapStation(dto: StationDto): Station {
  return {
    id: dto.PK_ChargingStationID,
    name: dto.Name,
    address: dto.Address,
    postCode: dto.PostCode,
    town: dto.Town,
    country: dto.Country,
    latitude: dto.Latitude,
    longitude: dto.Longitude,
    operatorName: dto.OperatorName,
    operatorLogoUrl: dto.OperatorLogoURL,
    type: dto.ChargingStationType,
    isOpen: dto.IsOpen,
    isActive: dto.IsActive,
    isFavorite: dto.IsFavorite,
    distance: dto.Distance,
    power: { minKwh: dto.kWhMin, maxKwh: dto.kWhMax },
    boxes: {
      total: dto.totalBoxes,
      available: dto.availableBoxes,
      occupied: dto.occupiedBoxes,
      offline: dto.offlineBoxes,
    },
    connectors: dto.Connectors.map(mapStationConnector),
  };
}

export function mapChargePoint(dto: ChargePointDto): ChargePoint {
  return {
    id: dto.PK_ChargePointID,
    name: dto.Name,
    chargerCode: dto.ChargerCode,
    isActive: dto.IsActive,
    isOpen: dto.IsOpen,
    isFavorite: dto.IsFavorite,
    status: dto.CurrentStatus,
    maxKw: dto.MaxKW,
    volts: dto.Volts,
    connectors: dto.ConnectorTypes.map(mapConnectorType),
  };
}

export function mergeStationDetail(base: Station, dto: StationDetailDto): StationDetail {
  const pricing = dto.Summary?.PricingNow;
  const support = dto.SupportInformation;

  return {
    ...base,
    ownerName: dto.OwnedByCompanyName,
    pricing: pricing
      ? {
          currency: pricing.Currency ?? dto.Currency,
          costPerKwh: pricing.ChargingCostKWH,
          startupCost: pricing.StartupCostPrice,
          vatPercent: pricing.CostPriceVATPercentage,
          pricingType: pricing.Type_Cost_Charging,
        }
      : null,
    support: support
      ? {
          phone: support.PhoneNumberString,
          email: support.SupportEmail,
          website: support.SupportWebsite,
          customerServiceUrl: support.SupportCustomerServiceURL,
        }
      : null,
    chargePoints: (dto.ChargingPoints ?? []).map(mapChargePoint),
  };
}
