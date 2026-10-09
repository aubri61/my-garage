package com.mygarage.backend.vehicle;
import java.util.Map;
import java.util.Set;
import com.mygarage.backend.sharing.SharingException;
import org.springframework.http.HttpStatus;
final class VehicleCatalog {
    private record Model(String body, Set<String> powers) {}
    private static Model ev(String body) { return new Model(body,Set.of("전기차")); }
    private static Model mixed(String body) { return new Model(body,Set.of("가솔린","디젤","하이브리드")); }
    private static final Map<String,Model> MODELS=Map.ofEntries(
        Map.entry("현대/IONIQ 5",ev("SUV")),Map.entry("현대/IONIQ 6",ev("세단")),Map.entry("현대/Kona Electric",ev("SUV")),Map.entry("현대/Casper Electric",ev("경차")),
        Map.entry("현대/Avante",new Model("세단",Set.of("가솔린","하이브리드"))),Map.entry("현대/Sonata",new Model("세단",Set.of("가솔린","하이브리드"))),Map.entry("현대/Grandeur",new Model("세단",Set.of("가솔린","하이브리드"))),
        Map.entry("현대/Tucson",mixed("SUV")),Map.entry("현대/Santa Fe",mixed("SUV")),Map.entry("현대/Palisade",mixed("SUV")),
        Map.entry("기아/EV3",ev("SUV")),Map.entry("기아/EV6",ev("SUV")),Map.entry("기아/EV9",ev("SUV")),Map.entry("기아/Niro EV",ev("SUV")),Map.entry("기아/Ray EV",ev("경차")),
        Map.entry("기아/K5",new Model("세단",Set.of("가솔린","하이브리드"))),Map.entry("기아/K8",new Model("세단",Set.of("가솔린","하이브리드"))),Map.entry("기아/Sportage",mixed("SUV")),Map.entry("기아/Sorento",mixed("SUV")),Map.entry("기아/Carnival",mixed("미니밴")));
    static void validate(String maker, String name, String power, String body) {
        var model=MODELS.get(maker+"/"+name);
        if ((power != null || body != null) && model == null) throw new SharingException(HttpStatus.BAD_REQUEST,"CATALOG_INVALID","지원하는 제조사와 차종을 선택해주세요.");
        if (model != null && ((power != null && !model.powers.contains(power)) || (body != null && !model.body.equals(body)))) throw new SharingException(HttpStatus.BAD_REQUEST,"CATALOG_INVALID","해당 차종에서 지원하는 동력 유형과 차체 분류를 선택해주세요.");
    }
}
