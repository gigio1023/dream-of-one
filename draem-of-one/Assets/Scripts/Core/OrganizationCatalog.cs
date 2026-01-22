using System;
using System.Collections.Generic;

namespace DreamOfOne.Core
{
    [Serializable]
    public struct OrganizationDefinition
    {
        public string id;
        public string goal;
        public string[] procedures;
        public string[] resources;
        public string[] artifacts;
        public string[] roles;
    }

    /// <summary>
    /// 조직 정의(Goal/Procedure/Resource/Artifact)를 코드로 보관한다.
    /// </summary>
    public static class OrganizationCatalog
    {
        private static readonly Dictionary<string, OrganizationDefinition> definitions = new();

        static OrganizationCatalog()
        {
            Add(new OrganizationDefinition
            {
                id = "Studio",
                goal = "RC 제출/릴리즈 안정화",
                procedures = new[] { "칸반 갱신", "패치노트", "승인", "RC 삽입" },
                resources = new[] { "칸반 보드", "라운지", "서버 슬롯" },
                artifacts = new[] { "칸반 로그", "패치노트", "승인 노트", "RC 스트립" },
                roles = new[] { "PM", "Developer", "QA", "Release" }
            });

            Add(new OrganizationDefinition
            {
                id = "Station",
                goal = "경범 처리/재발 방지",
                procedures = new[] { "신고 접수", "현장 확인", "증거 수집", "심문", "판정" },
                resources = new[] { "티켓 발부", "프린터", "캡처 보드" },
                artifacts = new[] { "위반 티켓", "CCTV 캡처", "사건 로그 스트립" },
                roles = new[] { "Police", "Officer", "Investigator" }
            });

            Add(new OrganizationDefinition
            {
                id = "Store",
                goal = "품절 0/라벨 갱신/거래 질서 유지",
                procedures = new[] { "라벨 점검", "재고 갱신", "카운터 규칙" },
                resources = new[] { "라벨 시스템", "카운터" },
                artifacts = new[] { "가격/품절 라벨", "거래 메모" },
                roles = new[] { "Clerk", "Manager" }
            });

            Add(new OrganizationDefinition
            {
                id = "Park",
                goal = "좌석/소음/촬영 규범 유지",
                procedures = new[] { "현장 경고", "조치", "보고서" },
                resources = new[] { "게시판", "조치 권한" },
                artifacts = new[] { "조치 보고", "게시판 공지", "민원 메모" },
                roles = new[] { "Elder", "Caretaker" }
            });

            Add(new OrganizationDefinition
            {
                id = "Cafe",
                goal = "주문 질서/좌석 회전/소음 관리",
                procedures = new[] { "주문", "대기", "좌석 안내", "정리" },
                resources = new[] { "주문대", "번호표", "좌석표" },
                artifacts = new[] { "주문 메모", "좌석/정리 로그" },
                roles = new[] { "Barista", "CafeHost" }
            });

            Add(new OrganizationDefinition
            {
                id = "Delivery",
                goal = "정시 배송/출입 규정 준수",
                procedures = new[] { "픽업", "출입 확인", "수취 서명", "반출" },
                resources = new[] { "배송 카트", "출입 체크리스트" },
                artifacts = new[] { "배송 라벨", "수령 서명 로그" },
                roles = new[] { "Courier" }
            });

            Add(new OrganizationDefinition
            {
                id = "Facility",
                goal = "시설 안전 유지/장애 최소화",
                procedures = new[] { "정기 점검", "수리 요청", "작업 승인", "완료 보고" },
                resources = new[] { "점검 체크리스트", "작업 허가서" },
                artifacts = new[] { "점검 로그", "수리 티켓" },
                roles = new[] { "FacilityTech" }
            });

            Add(new OrganizationDefinition
            {
                id = "Media",
                goal = "촬영 허가 준수/촬영 구역 안전 유지",
                procedures = new[] { "사전 허가", "구역 표시", "촬영", "반납" },
                resources = new[] { "촬영 장비", "허가서" },
                artifacts = new[] { "촬영 허가서", "촬영 로그" },
                roles = new[] { "Reporter" }
            });
        }

        public static bool TryGet(string id, out OrganizationDefinition definition)
        {
            if (!string.IsNullOrEmpty(id) && definitions.TryGetValue(id, out definition))
            {
                return true;
            }

            definition = default;
            return false;
        }

        private static void Add(OrganizationDefinition definition)
        {
            if (string.IsNullOrEmpty(definition.id))
            {
                return;
            }

            definitions[definition.id] = definition;
        }
    }
}
