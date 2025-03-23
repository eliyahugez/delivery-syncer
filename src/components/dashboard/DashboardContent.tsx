
import React from "react";
import DeliveryTable from "@/components/deliveries/DeliveryTable";
import DeliveryGroups from "@/components/deliveries/DeliveryGroups";
import { Delivery } from "@/types/delivery";
import { DeliveryStatusOption } from "@/hooks/useDeliveries";

interface DashboardContentProps {
  viewMode: "table" | "groups";
  deliveries: Delivery[];
  onUpdateStatus: (id: string, newStatus: string, updateType?: string) => void;
  onCompleteDelivery: (id: string, deliveryInfo: any) => void;
  isLoading: boolean;
  sheetsUrl?: string;
  statusOptions: DeliveryStatusOption[];
  groupsRecord: Record<string, Delivery[]>;
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  viewMode,
  deliveries,
  onUpdateStatus,
  onCompleteDelivery,
  isLoading,
  sheetsUrl,
  statusOptions,
  groupsRecord,
}) => {
  if (viewMode === "table") {
    return (
      <DeliveryTable
        deliveries={deliveries}
        onUpdateStatus={onUpdateStatus}
        onCompleteDelivery={onCompleteDelivery}
        isLoading={isLoading}
        sheetsUrl={sheetsUrl}
        statusOptions={statusOptions}
      />
    );
  } else {
    return (
      <DeliveryGroups
        groups={groupsRecord}
        statusOptions={statusOptions}
        onUpdateStatus={onUpdateStatus}
        onCompleteDelivery={onCompleteDelivery}
        isLoading={isLoading}
      />
    );
  }
};

export default DashboardContent;
