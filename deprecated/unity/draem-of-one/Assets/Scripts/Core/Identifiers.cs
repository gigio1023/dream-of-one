using System;

namespace DreamOfOne.Core
{
    public enum OrganizationId
    {
        None,
        Studio,
        Station,
        Store,
        Park,
        Cafe,
        Delivery,
        Facility,
        Media
    }

    public enum RoleId
    {
        None,
        Citizen,
        Tourist,
        Resident,
        Student,
        PM,
        Developer,
        QA,
        Release,
        Police,
        Officer,
        Investigator,
        Clerk,
        Manager,
        Elder,
        Caretaker,
        Barista,
        CafeHost,
        Courier,
        FacilityTech,
        Reporter
    }

    public enum AnchorId
    {
        None,
        StoreBuilding,
        StudioBuildingL1,
        ParkArea,
        Station,
        Cafe
    }

    public static class IdentifierUtility
    {
        public static OrganizationId ParseOrganizationId(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return OrganizationId.None;
            }

            if (Enum.TryParse(value.Trim(), ignoreCase: true, out OrganizationId id))
            {
                return id;
            }

            return OrganizationId.None;
        }

        public static RoleId ParseRoleId(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return RoleId.None;
            }

            string trimmed = value.Trim();
            if (string.Equals(trimmed, "경찰", StringComparison.OrdinalIgnoreCase))
            {
                return RoleId.Police;
            }

            if (string.Equals(trimmed, "순경", StringComparison.OrdinalIgnoreCase))
            {
                return RoleId.Officer;
            }

            if (string.Equals(trimmed, "조사관", StringComparison.OrdinalIgnoreCase))
            {
                return RoleId.Investigator;
            }

            if (string.Equals(trimmed, "관광객", StringComparison.OrdinalIgnoreCase))
            {
                return RoleId.Tourist;
            }

            if (string.Equals(trimmed, "주민", StringComparison.OrdinalIgnoreCase))
            {
                return RoleId.Resident;
            }

            if (string.Equals(trimmed, "학생", StringComparison.OrdinalIgnoreCase))
            {
                return RoleId.Student;
            }

            if (string.Equals(trimmed, "시민", StringComparison.OrdinalIgnoreCase))
            {
                return RoleId.Citizen;
            }

            if (Enum.TryParse(trimmed, ignoreCase: true, out RoleId id))
            {
                return id;
            }

            return RoleId.None;
        }

        public static AnchorId ParseAnchorId(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return AnchorId.None;
            }

            string trimmed = value.Trim();
            if (string.Equals(trimmed, "StudioBuilding_L1", StringComparison.OrdinalIgnoreCase))
            {
                return AnchorId.StudioBuildingL1;
            }

            if (Enum.TryParse(trimmed, ignoreCase: true, out AnchorId id))
            {
                return id;
            }

            return AnchorId.None;
        }

        public static string ToAnchorName(this AnchorId anchorId)
        {
            return anchorId switch
            {
                AnchorId.StoreBuilding => "StoreBuilding",
                AnchorId.StudioBuildingL1 => "StudioBuilding_L1",
                AnchorId.ParkArea => "ParkArea",
                AnchorId.Station => "Station",
                AnchorId.Cafe => "Cafe",
                _ => string.Empty
            };
        }
    }
}
