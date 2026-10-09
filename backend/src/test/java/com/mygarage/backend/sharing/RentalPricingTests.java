package com.mygarage.backend.sharing;
import com.mygarage.backend.user.*;
import com.mygarage.backend.vehicle.*;
import com.mygarage.backend.vehicle.dto.*;
import java.time.*;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.mygarage.backend.sharing.SharingDtos.*;
@SpringBootTest @Transactional
class RentalPricingTests {
 @Autowired SharingService sharing; @Autowired VehicleService service; @Autowired VehicleRepository vehicles; @Autowired UserRepository users;
 @MockitoBean Clock clock;
 Instant now=Instant.parse("2030-01-01T10:00:00Z"); User owner,renter; Vehicle vehicle;
 @BeforeEach void setup() { when(clock.instant()).thenReturn(now); String id=UUID.randomUUID().toString(); owner=users.save(new User("소유자","price-owner-"+id+"@example.com","hash"));renter=users.save(new User("대여자","price-renter-"+id+"@example.com","hash")); vehicle=vehicles.saveAndFlush(new Vehicle(owner,"현대","IONIQ 5",2025,"123가4567")); sharing.sharing(owner.getEmail(),vehicle.getId(),new SharingRequest(true,"서울 시청",37.5665,126.978)); }
 @Test void noPriceIsPreservedAndCannotCreateNewPricelessContract() { assertThat(service.detail(owner.getEmail(),vehicle.getId()).hourlyRate()).isNull(); assertThatThrownBy(()->sharing.request(renter.getEmail(),new RentalRequest(vehicle.getId(),now,now.plusSeconds(3600)))).hasMessageContaining("가격"); }
 @Test void serverRoundsUpAndSnapshotsRateAcrossOwnerUpdates() { vehicle.configureRentalTerms(12000L,"전기차","SUV","전기차",1); var input=new RentalRequest(vehicle.getId(),now,now.plusSeconds(3601)); var quote=sharing.quote(renter.getEmail(),input); assertThat(quote.billedHours()).isEqualTo(2); assertThat(quote.estimatedTotal()).isEqualTo(24000L); var rental=sharing.request(renter.getEmail(),input); var request=new VehicleRequest("현대","IONIQ 5",2025,"123가4567",null,19000L,"전기차","SUV","수정",1); service.update(owner.getEmail(),vehicle.getId(),request); assertThat(sharing.detail(renter.getEmail(),rental.id()).hourlyRate()).isEqualTo(12000L); assertThat(sharing.detail(renter.getEmail(),rental.id()).estimatedTotal()).isEqualTo(24000L); assertThat(sharing.quote(renter.getEmail(),input).hourlyRate()).isEqualTo(19000L); }
 @Test void invalidPricesFuelAndOwnershipCannotModifyVehicle() { assertThatThrownBy(()->vehicle.configureRentalTerms(0L,null,null,null,1)).isInstanceOf(IllegalArgumentException.class);assertThatThrownBy(()->vehicle.configureRentalTerms(-1L,null,null,null,1)).isInstanceOf(IllegalArgumentException.class); var valid=new VehicleRequest("현대","IONIQ 5",2025,"123가4567",null,12000L,"전기차","SUV","",1); assertThatThrownBy(()->service.update(renter.getEmail(),vehicle.getId(),valid)).isInstanceOf(VehicleNotFoundException.class);var invalid=new VehicleRequest("현대","IONIQ 5",2025,"123가4567",null,12000L,"가솔린","SUV","",1);assertThatThrownBy(()->service.update(owner.getEmail(),vehicle.getId(),invalid)).isInstanceOf(SharingException.class); }
 @Test void modelEditCannotKeepPreviousModelsClassification() { vehicle.configureRentalTerms(12000L,"전기차","SUV","",1); service.update(owner.getEmail(),vehicle.getId(),new VehicleRequest("기타","이전 등록 모델",2025,"123가4567",null,12000L,null,null,"",1));var updated=service.detail(owner.getEmail(),vehicle.getId());assertThat(updated.powerType()).isNull();assertThat(updated.bodyType()).isNull(); }
 @Test void minimumDurationAndOwnPrivateQuoteAreEnforced() { vehicle.configureRentalTerms(12000L,null,null,null,2); assertThatThrownBy(()->sharing.quote(renter.getEmail(),new RentalRequest(vehicle.getId(),now,now.plusSeconds(3600)))).hasMessageContaining("최소"); assertThatThrownBy(()->sharing.quote(owner.getEmail(),new RentalRequest(vehicle.getId(),now,now.plusSeconds(7200)))).isInstanceOf(VehicleNotFoundException.class);sharing.sharingState(owner.getEmail(),vehicle.getId(),false); assertThatThrownBy(()->sharing.quote(renter.getEmail(),new RentalRequest(vehicle.getId(),now,now.plusSeconds(7200)))).isInstanceOf(VehicleNotFoundException.class); }
}
