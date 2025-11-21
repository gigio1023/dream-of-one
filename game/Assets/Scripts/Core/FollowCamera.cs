using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 간단한 추적 카메라. 플레이어 뒤쪽에서 따라오도록 기본 동작만 제공한다.
    /// 씬 초기 셋업 속도를 높이기 위한 유틸이다.
    /// </summary>
    public sealed class FollowCamera : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("추적할 대상. 일반적으로 Player Transform.")]
        private Transform target = null;

        [SerializeField]
        [Tooltip("대상 기준 상대 위치")]
        private Vector3 offset = new(0f, 6f, -6f);

        [SerializeField]
        [Tooltip("위치 보간 속도")]
        private float followSpeed = 5f;

        [SerializeField]
        [Tooltip("회전 보간 속도(도/초)")]
        private float rotateSpeed = 120f;

        private void LateUpdate()
        {
            if (target == null)
            {
                return;
            }

            Vector3 desiredPosition = target.position + offset;
            transform.position = Vector3.Lerp(transform.position, desiredPosition, followSpeed * Time.deltaTime);

            Quaternion desiredRotation = Quaternion.LookRotation(target.position - transform.position, Vector3.up);
            transform.rotation = Quaternion.RotateTowards(transform.rotation, desiredRotation, rotateSpeed * Time.deltaTime);
        }
    }
}


