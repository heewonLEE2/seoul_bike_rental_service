const apiKey = "6f6d45546f676d6c32346f486a7955";
let map;
let dataArr = [];
let currentInfowindow = null;
let clusterMarkers = []; // 클러스터 마커 배열
let stationMarkers = []; // 대여소 마커 배열
let currentLevel = 8; // 현재 지도 레벨
let currentStations = []; // 현재 표시된 대여소 목록

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
      <div class="cluster-label">${district.name}</div>
      <div class="cluster-circle">
        ${count}
      </div>
    `;

    const overlay = new kakao.maps.CustomOverlay({
      position: position,
      content: content,
      yAnchor: 0.5,
      zIndex: 1000,
    });

    overlay.setMap(map);

    // 클러스터 클릭 이벤트
    content.addEventListener("click", function () {
      showSidebarWithStations(district.lat, district.lng, district.name);
    });

    clusterMarkers.push(overlay);
  });

  console.log(`${clusterMarkers.length}개의 클러스터 표시`);
}

// 사이드바 표시 및 대여소 마커 표시
function showSidebarWithStations(centerLat, centerLng, districtName) {
  // 지도 축소 및 이동
  const mapElement = document.getElementById("map");
  const sidebar = document.getElementById("sidebar");
  const mainTitle = document.getElementById("mainTitle");
  const resetBtn = document.getElementById("resetBtn");

  mapElement.classList.add("shrink");
  mainTitle.classList.add("shift-left");

  setTimeout(() => {
    sidebar.classList.add("open");
    resetBtn.classList.add("show");
  }, 200);

  // 지도 중심 이동 및 확대
  const position = new kakao.maps.LatLng(centerLat, centerLng);
  map.setLevel(5);
  map.setCenter(position);

  // 대여소 마커 표시
  displayStationsInArea(centerLat, centerLng, districtName);
}

// 특정 구역의 대여소 마커 표시
function displayStationsInArea(centerLat, centerLng, districtName) {
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

  currentStations = nearbyStations;

  nearbyStations.forEach((station, index) => {
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
        총 거치대: ${station.rackTotCnt}개<br>
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

    stationMarkers.push({ marker, infowindow, station, position });
  });

  console.log(`${nearbyStations.length}개의 대여소 마커 표시`);

  // 사이드바에 리스트 표시
  displayStationList(districtName);

  // 검색 기능 초기화
  initSearch();
}

// 사이드바에 대여소 리스트 표시
function displayStationList(districtName, filteredStations = null) {
  const listContainer = document.getElementById("stationList");
  const stationsToDisplay = filteredStations || currentStations;

  listContainer.innerHTML = `<div style="padding: 10px; background: #e3f2fd; margin-bottom: 10px; border-radius: 6px;">
    <strong>${districtName}</strong> - ${
    filteredStations
      ? `검색 결과: ${filteredStations.length}개`
      : `총 ${currentStations.length}개 대여소`
  }
  </div>`;

  // 이름에서 숫자와 점 제거 후 오름차순 정렬
  const sortedStations = [...stationsToDisplay].sort((a, b) => {
    const nameA = a.stationName.replace(/^\d+\.\s*/, "").trim();
    const nameB = b.stationName.replace(/^\d+\.\s*/, "").trim();
    return nameA.localeCompare(nameB, "ko");
  });

  sortedStations.forEach((station, index) => {
    const available = station.rackTotCnt - station.parkingBikeTotCnt;
    const availableClass = available > 0 ? "available" : "unavailable";

    // 원래 배열에서의 인덱스 찾기 (마커와 매칭하기 위해)
    const originalIndex = currentStations.indexOf(station);

    const item = document.createElement("div");
    item.className = "station-item";
    item.setAttribute("data-index", originalIndex);

    // 이름에서 숫자와 점 제거
    const displayName = station.stationName.replace(/^\d+\.\s*/, "").trim();

    item.innerHTML = `
      <div class="station-name">${displayName}</div>
      <div class="station-info">
        <span>🚲 거치대: ${station.rackTotCnt}개</span>
        <span>📍 주차: ${station.parkingBikeTotCnt}대</span>
        <br>
        <span class="${availableClass}">💺 거치대 잔여: ${available}개</span>
      </div>
    `;

    // 리스트 아이템 클릭 이벤트
    item.addEventListener("click", function () {
      // 모든 아이템에서 active 클래스 제거
      document.querySelectorAll(".station-item").forEach((el) => {
        el.classList.remove("active");
      });
      // 현재 아이템에 active 클래스 추가
      item.classList.add("active");

      // 해당 마커 위치로 지도 이동 (지도가 60%이므로 중심 조정)
      const markerData = stationMarkers[originalIndex];
      map.setCenter(markerData.position);
      map.setLevel(3); // 더 확대

      // 인포윈도우 열기
      if (currentInfowindow) {
        currentInfowindow.close();
      }
      markerData.infowindow.open(map, markerData.marker);
      currentInfowindow = markerData.infowindow;
    });

    listContainer.appendChild(item);
  });
}

// 검색 기능 초기화
function initSearch() {
  const searchInput = document.getElementById("searchInput");
  let currentDistrictName =
    document.querySelector(".station-list > div > strong")?.textContent || "";

  searchInput.value = ""; // 검색창 초기화

  searchInput.addEventListener("input", function (e) {
    const searchTerm = e.target.value.trim().toLowerCase();

    if (searchTerm === "") {
      // 검색어가 비어있으면 전체 목록 표시
      displayStationList(currentDistrictName);
      return;
    }

    // 현재 표시된 대여소 중에서 검색
    const filteredStations = currentStations.filter((station) => {
      const stationName = station.stationName
        .replace(/^\d+\.\s*/, "")
        .trim()
        .toLowerCase();
      return stationName.includes(searchTerm);
    });

    // 검색 결과 표시
    displayStationList(currentDistrictName, filteredStations);
  });
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
  currentStations = [];

  if (currentInfowindow) {
    currentInfowindow.close();
    currentInfowindow = null;
  }
}

// 사이드바 닫기
function closeSidebar() {
  const mapElement = document.getElementById("map");
  const sidebar = document.getElementById("sidebar");
  const mainTitle = document.getElementById("mainTitle");
  const resetBtn = document.getElementById("resetBtn");
  const searchInput = document.getElementById("searchInput");

  sidebar.classList.remove("open");
  resetBtn.classList.remove("show");

  // 검색창 초기화
  if (searchInput) {
    searchInput.value = "";
  }

  setTimeout(() => {
    mapElement.classList.remove("shrink");
    mainTitle.classList.remove("shift-left");

    // 지도 크기가 변경되었으므로 재조정
    setTimeout(() => {
      map.relayout();
    }, 100);
  }, 200);

  // 지도 레벨 복원하고 클러스터 다시 표시
  setTimeout(() => {
    map.setLevel(8);
    map.setCenter(new kakao.maps.LatLng(37.5665, 126.978));
    displayClusters();
  }, 500);
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
        closeSidebar();
      }
    });

    // 지도 클릭 시 인포윈도우 닫기
    kakao.maps.event.addListener(map, "click", function () {
      closeInfowindow();
    });

    // 전체 화면 버튼
    document.getElementById("resetBtn").addEventListener("click", function () {
      closeSidebar();
    });

    loadData();
  });
};
