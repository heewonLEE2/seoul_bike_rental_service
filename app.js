const apiKey = "6f6d45546f676d6c32346f486a7955";
let map;
let dataArr = [];
let currentInfowindow = null;
let clusterMarkers = []; // 클러스터 마커 배열
let stationMarkers = []; // 대여소 마커 배열
let currentLevel = 8; // 현재 지도 레벨

// 서울 주요 구역 (25개 자치구의 중심좌표)
const seoulDistricts = [
  { name: "종로구", lat: 37.5735, lng: 126.9788 },
  { name: "중구", lat: 37.5641, lng: 126.9979 },
  { name: "용산구", lat: 37.5311, lng: 126.981 },
  { name: "성동구", lat: 37.5634, lng: 127.0371 },
  { name: "광진구", lat: 37.5384, lng: 127.0822 },
  { name: "동대문구", lat: 37.5744, lng: 127.0396 },
  { name: "중랑구", lat: 37.6063, lng: 127.0925 },
  { name: "성북구", lat: 37.5894, lng: 127.0167 },
  { name: "강북구", lat: 37.6396, lng: 127.0257 },
  { name: "도봉구", lat: 37.6688, lng: 127.0471 },
  { name: "노원구", lat: 37.6542, lng: 127.0568 },
  { name: "은평구", lat: 37.6027, lng: 126.9291 },
  { name: "서대문구", lat: 37.5791, lng: 126.9368 },
  { name: "마포구", lat: 37.5663, lng: 126.9019 },
  { name: "양천구", lat: 37.517, lng: 126.8664 },
  { name: "강서구", lat: 37.5509, lng: 126.8495 },
  { name: "구로구", lat: 37.4954, lng: 126.8874 },
  { name: "금천구", lat: 37.4519, lng: 126.8955 },
  { name: "영등포구", lat: 37.5264, lng: 126.8962 },
  { name: "동작구", lat: 37.5124, lng: 126.9393 },
  { name: "관악구", lat: 37.4784, lng: 126.9516 },
  { name: "서초구", lat: 37.4837, lng: 127.0324 },
  { name: "강남구", lat: 37.5172, lng: 127.0473 },
  { name: "송파구", lat: 37.5145, lng: 127.1059 },
  { name: "강동구", lat: 37.5301, lng: 127.1238 },
];

async function loadData() {
  const totalData = 2741;
  const pageSize = 1000;

  try {
    for (let start = 1; start <= totalData; start += pageSize) {
      const end = Math.min(start + pageSize - 1, totalData);
      const APIURL = `http://openapi.seoul.go.kr:8088/${apiKey}/json/bikeList/${start}/${end}/`;

      const response = await fetch(APIURL);
      const data = await response.json();

      if (data.rentBikeStatus && data.rentBikeStatus.row) {
        dataArr.push(...data.rentBikeStatus.row);
      }
    }

    console.log(`전체 데이터 수집 완료: 총 ${dataArr.length}개`);
    displayClusters(); // 초기에는 클러스터 표시
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

// 각 구역별 대여소 개수 계산
function countStationsInDistrict(district) {
  const radius = 0.05; // 약 5km 반경
  return dataArr.filter((station) => {
    const distance = getDistance(
      district.lat,
      district.lng,
      station.stationLatitude,
      station.stationLongitude
    );
    return distance <= radius;
  }).length;
}

// 두 좌표 간의 거리 계산 (간단한 유클리드 거리)
function getDistance(lat1, lng1, lat2, lng2) {
  return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
}

// 클러스터 마커 표시 (구역별)
function displayClusters() {
  // 기존 마커 제거
  clearAllMarkers();

  seoulDistricts.forEach((district) => {
    const count = countStationsInDistrict(district);
    if (count === 0) return; // 대여소가 없는 구역은 표시 안함

    const position = new kakao.maps.LatLng(district.lat, district.lng);

    // 커스텀 오버레이로 동그란 클러스터 마커 생성
    const content = document.createElement("div");
    content.className = "cluster-marker";
    content.innerHTML = `
      <div style="
        background: #4285f4;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        border: 3px solid white;
      ">
        ${count}
      </div>
    `;

    const overlay = new kakao.maps.CustomOverlay({
      position: position,
      content: content,
      yAnchor: 0.5,
    });

    overlay.setMap(map);

    // 클러스터 클릭 이벤트
    content.addEventListener("click", function () {
      map.setLevel(5); // 줌 레벨 5로 확대
      map.setCenter(position);
      displayStationsInArea(district.lat, district.lng);
      document.getElementById("map").style.width = "70%";
    });

    clusterMarkers.push(overlay);
  });

  console.log(`${clusterMarkers.length}개의 클러스터 표시`);
}

// 특정 구역의 대여소 마커 표시
function displayStationsInArea(centerLat, centerLng) {
  // 기존 마커 제거
  clearAllMarkers();

  const radius = 0.05; // 약 5km 반경
  const nearbyStations = dataArr.filter((station) => {
    const distance = getDistance(
      centerLat,
      centerLng,
      station.stationLatitude,
      station.stationLongitude
    );
    return distance <= radius;
  });

  nearbyStations.forEach((station) => {
    const position = new kakao.maps.LatLng(
      station.stationLatitude,
      station.stationLongitude
    );

    const marker = new kakao.maps.Marker({
      map: map,
      position: position,
      title: station.stationName,
    });

    // 인포윈도우 내용
    const infoContent = `
      <div style="padding:10px; min-width:200px;">
        <strong>${station.stationName}</strong><br>
        거치대: ${station.rackTotCnt}개<br>
        주차 자전거: ${station.parkingBikeTotCnt}대<br>
        잔여: ${station.rackTotCnt - station.parkingBikeTotCnt}개
      </div>
    `;

    const infowindow = new kakao.maps.InfoWindow({
      content: infoContent,
    });

    // 마커 클릭 이벤트
    kakao.maps.event.addListener(marker, "click", function () {
      if (currentInfowindow) {
        currentInfowindow.close();
      }
      infowindow.open(map, marker);
      currentInfowindow = infowindow;
    });

    stationMarkers.push({ marker, infowindow });
  });

  console.log(`${nearbyStations.length}개의 대여소 마커 표시`);
}

// 모든 마커 제거
function clearAllMarkers() {
  // 클러스터 마커 제거
  clusterMarkers.forEach((overlay) => overlay.setMap(null));
  clusterMarkers = [];

  // 대여소 마커 제거
  stationMarkers.forEach((item) => {
    item.marker.setMap(null);
    if (item.infowindow) {
      item.infowindow.close();
    }
  });
  stationMarkers = [];

  if (currentInfowindow) {
    currentInfowindow.close();
    currentInfowindow = null;
  }
}

// 지도 레벨 변경 시 적절한 마커 표시
function updateDisplay() {
  const level = map.getLevel();

  // 레벨 7 이상이면 클러스터, 그 이하면 개별 대여소
  if (level >= 8) {
    displayClusters();
  }
  // 레벨이 낮을 때는 이미 표시된 대여소를 유지하거나
  // 현재 화면 중심 기준으로 다시 표시
}

// 지도 클릭 시 인포윈도우 닫기
function closeInfowindow() {
  if (currentInfowindow) {
    currentInfowindow.close();
    currentInfowindow = null;
  }
}

window.onload = () => {
  kakao.maps.load(function () {
    map = new kakao.maps.Map(document.getElementById("map"), {
      center: new kakao.maps.LatLng(37.5665, 126.978),
      level: 8,
    });

    // 지도 레벨 변경 이벤트
    kakao.maps.event.addListener(map, "zoom_changed", function () {
      const level = map.getLevel();
      if (level >= 7 && stationMarkers.length > 0) {
        // 줌 아웃하면 다시 클러스터 표시
        updateDisplay();
      }
    });

    // 지도 클릭 시 인포윈도우 닫기
    kakao.maps.event.addListener(map, "click", function () {
      closeInfowindow();
    });

    loadData();
  });
};
