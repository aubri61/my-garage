import { SharingShell } from "@/features/sharing/components/sharing-shell";
import { RegistrationFlow } from "@/features/vehicle-registration/components/registration-flow";
export default function VehicleRegisterPage() { return <SharingShell mode="owner" title="차량 등록"><div className="vehicle-editor"><div className="registration-intro"><h2>내 차량 등록하기</h2><p>차량 정보와 이용 조건을 입력하고, 이웃과 공유할 픽업 위치를 정해주세요.</p></div><RegistrationFlow /></div></SharingShell>; }
