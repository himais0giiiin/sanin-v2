document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM要素の取得 ---
    const stationListDiv = document.getElementById('station-list');
    const trainListDiv = document.getElementById('train-list');
    const suspensionListDiv = document.getElementById('suspension-list');
    const currentTimeDiv = document.getElementById('current-time');
    const announcementsDiv = document.getElementById('announcements-board');
    const tooltip = document.getElementById('tooltip');
    const legendWaitingIcon = document.querySelector('.legend-icon.waiting');
    const legendUpIcon = document.querySelector('.legend-icon.up');
    const legendDownIcon = document.querySelector('.legend-icon.down');
    const legendStoppedIcon = document.querySelector('.legend-icon.stopped');
    const sanyoLineBranch = document.getElementById('sanyo-line-branch');

    // 画像パスの定義
    const imagePaths = {
        up: 'images/up_arrow.png',
        down: 'images/down_arrow.png',
        waiting: 'images/waiting_icon.png',
        stopped: 'images/stopped_icon.png',
        info: 'images/info_icon.png',
        suspended_info: 'images/suspended_info.png',
        delayed_up: 'images/delayed_up_arrow.png',
        delayed_down: 'images/delayed_down_arrow.png',
        substitute_up: 'images/substitute_up_bus.png',
        substitute_down: 'images/substitute_down_bus.png'
    };

    // 凡例アイコンを画像に置き換え
    legendUpIcon.innerHTML = `<img src="${imagePaths.up}" alt="上り" style="width: 25px; height: 25px;">`;
    legendDownIcon.innerHTML = `<img src="${imagePaths.down}" alt="下り" style="width: 25px; height: 25px;">`;
    legendWaitingIcon.innerHTML = `<img src="${imagePaths.waiting}" alt="停車中(定刻)" style="width: 25px; height: 25px;">`;
    legendStoppedIcon.innerHTML = `<img src="${imagePaths.stopped}" alt="停車中(支障)" style="width: 25px; height: 25px;">`;


    // --- データ定義 ---
    const announcements = [
        {id: 'info2', type: 'info', message:"この走行位置は2025年度改正のダイヤに準拠しています。"},
        {id: 'info3', type: 'info', message:'遅延情報は、複数列車が10分以上遅延したときに反映されます。'},
        {id: 'info4', type: 'suspended', message:'山陰線では、大雨のため黒井村駅～幡生駅間で徐行運転をしています。このため、列車に５～４５分の遅れがでています。'},
    ];
    const operationalIssues = [
        //{ trainId: '449D', stationId: 6, reason: '車両の確認' }
    ];
    const suspendedSections = [
        // 運休区間を表示したい場合はコメントを解除し、適切な区間を設定してください
        // { fromStationId: 7, toStationId: 10, reason: '大雨による土砂災害のため、梅ヶ峠～小串駅間で終日運転を見合わせています。' },
        { fromStationId: 4, toStationId: 10, reason: '線路点検のため、17:13より20分ほど、安岡～小串間で運転を見合わせます。', startTime: '17:13', endTime: '17:33' }
    ];
    // NEW: お知らせ範囲のデータ
    const infoRangeSections = [
        { fromStationId: 0, toStationId: 4, reason: 'この区間は大雨のため、速度を落として運転します。', startTime: '06:00', endTime: '23:00' },
        ///{ fromStationId: 1, toStationId: 3, reason: '幡生駅構内での車両点検のため、一部列車に遅れが発生する可能性があります。', startTime: '00:00', endTime: '23:59' }
    ];

    const stations = [
        { id: 0, name: '下関', iconUrl: 'images/sanyo.png', stationCode: '山陽線' }, // 例: アイコンURLを追加
        { id: 1, name: '幡生', iconUrl: 'images/sanin-yo.png', stationCode: '山陽線/山陰本線' },
        { id: 2, name: '綾羅木', iconUrl: 'images/sanin.png', stationCode: '山陰本線' },
        { id: 3, name: '梶栗郷台地', iconUrl: 'images/sanin.png', stationCode: '山陰本線' },
        { id: 4, name: '安岡', iconUrl: 'images/sanin.png', stationCode: '山陰本線' },
        { id: 5, name: '福江', iconUrl: 'images/sanin.png', stationCode: '山陰本線' },
        { id: 6, name: '吉見', iconUrl: 'images/sanin.png', stationCode: '山陰本線' },
        { id: 7, name: '梅ヶ峠', iconUrl: 'images/sanin.png', stationCode: '山陰本線' },
        { id: 8, name: '黒井村', iconUrl: 'images/sanin.png', stationCode: '山陰本線' },
        { id: 9, name: '川棚温泉', iconUrl: 'images/sanin.png', stationCode: '山陰本線' },
        { id: 10, name: '小串', iconUrl: 'images/sanin.png', stationCode: '山陰本線' },
        { id: 11, name: '湯玉', iconUrl: 'images/sanin.png', stationCode: '山陰本線' },
        { id: 12, name: '宇賀本郷', iconUrl: 'images/sanin.png', stationCode: '山陰本線' },
        { id: 13, name: '長門二見', iconUrl: 'images/sanin.png', stationCode: '山陰本線' },
        { id: 14, name: '滝部', iconUrl: 'images/sanin.png', stationCode: '山陰本線' }
    ];

    // NEW: 乗りやすさ指標の定義
    const comfortLevels = [
        'とても空いています', // 0
        '空いています',       // 1
        'やや混雑',           // 2
        '混雑',               // 3
        '非常に混雑'          // 4
    ];

    // NEW: 乗りやすさ指標に対応するCSSクラス名
    const comfortClassMap = {
        0: 'comfort-value-very-empty',
        1: 'comfort-value-empty',
        2: 'comfort-value-slightly-crowded',
        3: 'comfort-value-crowded',
        4: 'comfort-value-very-crowded'
    };

    // 列車時刻表データ (script.js に直接記述)
    const trainSchedules = [
        // テスト用：午前1時台の列車 (下関方面 - 下り)
        {"trainId":"T005D","type":"普通","direction":"down","destination":"下関","delayMinutes":0, "comfortIndex": 1, "timetable":[
            {"stationId":14,"departure":"01:40"}, // 滝部発
            {"stationId":13,"arrival":"01:47","departure":"01:48"}, // 長門二見
            {"stationId":12,"arrival":"01:52","departure":"01:53"}, // 宇賀本郷
            {"stationId":11,"arrival":"01:57","departure":"01:58"}, // 湯玉
            {"stationId":10,"arrival":"02:05","departure":"02:06"}, // 小串
            {"stationId":9,"arrival":"02:10","departure":"02:11"}, // 川棚温泉
            {"stationId":8,"arrival":"02:14","departure":"02:15"}, // 黒井村
            {"stationId":7,"arrival":"02:20","departure":"02:21"}, // 梅ヶ峠
            {"stationId":6,"arrival":"02:25","departure":"02:26"}, // 吉見
            {"stationId":5,"arrival":"02:30","departure":"02:31"}, // 福江
            {"stationId":4,"arrival":"02:34","departure":"02:35"}, // 安岡
            {"stationId":3,"arrival":"02:37","departure":"02:38"}, // 梶栗郷台地
            {"stationId":2,"arrival":"02:40","departure":"02:41"}, // 綾羅木
            {"stationId":1,"arrival":"02:45","departure":"02:46"}, // 幡生
            {"stationId":0,"arrival":"02:51"}  // 下関着
        ]},

        // テスト用：午前1時台の列車 (滝部方面 - 上り)
        {"trainId":"T006U","type":"普通","direction":"up","destination":"滝部","delayMinutes":-2, "comfortIndex": 0, "timetable":[ // 2分早発
            {"stationId":0,"departure":"01:45"}, // 下関発 (定刻) -> 01:43 (実際)
            {"stationId":1,"arrival":"01:49","departure":"01:50"}, // 幡生 (定刻) -> 01:47/01:48 (実際)
            {"stationId":2,"arrival":"01:54","departure":"01:55"}, // 綾羅木
            {"stationId":3,"arrival":"01:57","departure":"01:58"}, // 梶栗郷台地
            {"stationId":4,"arrival":"02:00","departure":"02:01"}, // 安岡
            {"stationId":5,"arrival":"02:04","departure":"02:05"}, // 福江
            {"stationId":6,"arrival":"02:08","departure":"02:09"}, // 吉見
            {"stationId":7,"arrival":"02:14","departure":"02:15"}, // 梅ヶ峠
            {"stationId":8,"arrival":"02:19","departure":"02:20"}, // 黒井村
            {"stationId":9,"arrival":"02:23","departure":"02:24"}, // 川棚温泉
            {"stationId":10,"arrival":"02:27","departure":"02:28"}, // 小串
            {"stationId":11,"arrival":"02:35","departure":"02:36"}, // 湯玉
            {"stationId":12,"arrival":"02:39","departure":"02:40"}, // 宇賀本郷
            {"stationId":13,"arrival":"02:47","departure":"02:48"}, // 長門二見
            {"stationId":14,"arrival":"02:55"}  // 滝部着
        ]}
    ];


    // console.log('列車時刻表データが直接スクリプトに記述されました:', trainSchedules);


    // --- ヘルパー関数 ---
    function parseTime(timeStr) {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    function isSectionSuspendedNow(section, now) {
        if (!section.startTime || !section.endTime) return true;
        return now >= parseTime(section.startTime) && now < parseTime(section.endTime);
    }

    // デバイスがモバイルかどうかを判定するヘルパー関数 (今回はイベントリスナーの分岐には使用しないが、残しておく)
    function isMobileDevice() {
        return /Mobi|Android/i.test(navigator.userAgent);
    }

    // Global variable to keep track of the currently active tooltip's trigger element
    let activeTooltipElement = null;

    // --- 描画関数 ---
    function renderAnnouncements() {
        announcementsDiv.innerHTML = '';
        if (announcements && announcements.length > 0) {
            announcements.forEach(info => {
                const item = document.createElement('div');
                item.className = 'announcement-item';
                let iconSrc = '';
                let altText = '';
                if (info.type === 'suspended') {
                    iconSrc = imagePaths.suspended_info;
                    altText = '運休';
                } else {
                    iconSrc = imagePaths.info;
                    altText = 'お知らせ';
                }
                item.innerHTML = `<div class="announcement-icon"><img src="${iconSrc}" alt="${altText}" style="width: 16px; height: 16px;"></div><span>${info.message}</span>`;
                announcementsDiv.appendChild(item);
            });
        }
    }

    function renderStations() {
        stationListDiv.innerHTML = '';
        stations.forEach(station => {
            const stationDiv = document.createElement('div');
            stationDiv.className = 'station';
            stationDiv.id = `station-${station.id}`;

            // 駅名要素
            const stationNameSpan = document.createElement('span');
            stationNameSpan.className = 'station-name';
            stationNameSpan.textContent = station.name;
            stationDiv.appendChild(stationNameSpan);

            // 駅マーカー (〇マーク) を追加
            const stationMarkerDiv = document.createElement('div');
            stationMarkerDiv.className = 'station-marker';
            stationDiv.appendChild(stationMarkerDiv);

            // アイコン要素の追加
            if (station.iconUrl) {
                const iconWrapperDiv = document.createElement('div');
                iconWrapperDiv.className = 'station-icon-wrapper';
                const iconImg = document.createElement('img');
                iconImg.src = station.iconUrl;
                iconImg.alt = `${station.name}アイコン`;
                iconImg.className = 'station-icon';
                iconWrapperDiv.appendChild(iconImg);
                stationDiv.appendChild(iconWrapperDiv);

                // 駅アイコンにツールチップ表示機能を追加 (クリックで表示、他の場所をクリックで非表示)
                const tooltipContent = `<b>駅名:</b> ${station.name}<br><b>乗入れ路線:</b> ${station.stationCode || station.id}`;

                iconWrapperDiv.addEventListener('click', (e) => {
                    e.stopPropagation(); // イベントの伝播を停止して、ドキュメント全体のクリックイベントによるツールチップ非表示を防ぐ
                    showTooltip(e.target, tooltipContent);
                });
                // mouseover/mouseout は削除
            }

            stationListDiv.appendChild(stationDiv);
        });

        // 幡生駅のY座標を取得し、山陽線分岐の位置を設定
        const hatabuStationElem = document.getElementById('station-1');
        if (hatabuStationElem) {
            const hatabuY = hatabuStationElem.offsetTop + hatabuStationElem.offsetHeight / 2;
            sanyoLineBranch.style.top = `${hatabuY}px`;
        }
    }

    function renderSuspendedSections(now) {
        suspensionListDiv.innerHTML = '';
        suspendedSections.forEach(section => {
            if (!isSectionSuspendedNow(section, now)) return;
            const fromStationElem = document.getElementById(`station-${section.fromStationId}`);
            const toStationElem = document.getElementById(`station-${section.toStationId}`);
            if (!fromStationElem || !toStationElem) return;
            const topY = fromStationElem.offsetTop + fromStationElem.offsetHeight / 2;
            const bottomY = toStationElem.offsetTop + toStationElem.offsetHeight / 2;
            const suspensionDiv = document.createElement('div');
            suspensionDiv.className = 'suspended-section';
            suspensionDiv.style.top = `${topY}px`;
            suspensionDiv.style.height = `${bottomY - topY}px`;
            const tooltipContent = `<b>運休区間:</b> ${stations.find(s=>s.id === section.fromStationId).name}～${stations.find(s=>s.id === section.toStationId).name}<br><b>理由:</b> ${section.reason}`;
            suspensionDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                showTooltip(e.target, tooltipContent);
            });
            suspensionListDiv.appendChild(suspensionDiv);
        });
    }

    // NEW: お知らせ範囲のレンダリング関数
    function renderInfoRangeSections(now) {
        const infoRangeListDiv = document.getElementById('suspension-list'); // suspension-listを再利用
        infoRangeSections.forEach(section => {
            // 時間指定がある場合は現在時刻でフィルタリング
            if (section.startTime && section.endTime && !isSectionSuspendedNow(section, now)) {
                return;
            }
            const fromStationElem = document.getElementById(`station-${section.fromStationId}`);
            const toStationElem = document.getElementById(`station-${section.toStationId}`);
            if (!fromStationElem || !toStationElem) return;
            const topY = fromStationElem.offsetTop + fromStationElem.offsetHeight / 2;
            const bottomY = toStationElem.offsetTop + toStationElem.offsetHeight / 2;
            const infoRangeDiv = document.createElement('div');
            infoRangeDiv.className = 'info-range-section'; // 新しいクラスを適用
            infoRangeDiv.style.top = `${topY}px`;
            infoRangeDiv.style.height = `${bottomY - topY}px`;
            const tooltipContent = `<b>お知らせ区間:</b> ${stations.find(s=>s.id === section.fromStationId).name}～${stations.find(s=>s.id === section.toStationId).name}<br><b>内容:</b> ${section.reason}`;
            infoRangeDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                showTooltip(e.target, tooltipContent);
            });
            infoRangeListDiv.appendChild(infoRangeDiv);
        });
    }

    // --- ツールチップ関連 ---
    function showTooltip(targetElement, contentHtml) {
        // 同じ要素がクリックされた場合、ツールチップを非表示にする (トグル動作)
        if (activeTooltipElement === targetElement && tooltip.style.display === 'block') {
            hideTooltip();
            return;
        }

        // 以前に表示されていたツールチップがあれば非表示にする
        if (activeTooltipElement && activeTooltipElement !== targetElement) {
            hideTooltip();
        }

        tooltip.innerHTML = contentHtml;
        tooltip.style.visibility = 'hidden'; // サイズ測定のために一時的に非表示
        tooltip.style.display = 'block';     // サイズ測定のためにブロック要素にする

        const targetRect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;

        let top = targetRect.top - tooltipRect.height - 10;
        let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);

        // ツールチップが画面上部からはみ出す場合
        if (top < 10) top = targetRect.bottom + 10;
        // ツールチップが画面左右からはみ出す場合
        if (left < 10) left = 10;
        else if (left + tooltipRect.width > viewportWidth - 10) left = viewportWidth - tooltipRect.width - 10;

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.visibility = 'visible'; // 位置調整後に表示

        activeTooltipElement = targetElement; // 現在のトリガー要素を記録
    }

    function hideTooltip() {
        tooltip.style.display = 'none';
        activeTooltipElement = null; // アクティブ要素をクリア
    }

    // ドキュメント全体のクリックイベントでツールチップを非表示にする
    document.addEventListener('click', (e) => {
        // アクティブなツールチップがあり、クリックされた場所がツールチップ内でも、トリガー要素内でもない場合
        if (activeTooltipElement && !tooltip.contains(e.target) && !activeTooltipElement.contains(e.target)) {
            hideTooltip();
        }
    });

    // --- メインロジック ---
    function updatePositions() {
        const now = new Date();
        // デバッグ用: now.setHours(7, 48, 30); // 特定の時刻でテストする場合はコメントを解除
        currentTimeDiv.textContent = now.toLocaleTimeString('ja-JP');
        trainListDiv.innerHTML = '';
        renderSuspendedSections(now);
        renderInfoRangeSections(now); // NEW: お知らせ範囲のレンダリングを呼び出す

        // console.log('現在の時刻 (now):', now.toLocaleTimeString('ja-JP'));
        // console.log('処理対象の列車数:', trainSchedules.length);

        trainSchedules.forEach(train => {
            // trainTimeは遅延を考慮した時刻。列車の位置計算に使用。
            const trainTime = new Date(now.getTime() - train.delayMinutes * 60 * 1000);
            
            // console.log(`--- 列車ID: ${train.trainId} (遅延: ${train.delayMinutes}分) ---`);
            // console.log(`列車時刻 (trainTime): ${trainTime.toLocaleTimeString('ja-JP')}`);

            // 1. 運行支障の確認 (最優先)
            const issue = operationalIssues.find(p => p.trainId === train.trainId);
            if (issue) {
                const stationElem = document.getElementById(`station-${issue.stationId}`);
                if (!stationElem) {
                    // console.warn(`駅要素が見つかりません: station-${issue.stationId}`);
                    return;
                }
                const trainY = stationElem.offsetTop + stationElem.offsetHeight / 2;
                const trainDiv = document.createElement('div');
                trainDiv.className = 'train stopped-image';
                trainDiv.innerHTML = `<img src="${imagePaths.stopped}" alt="停車中(支障)" style="width: 25px; height: 25px;">`;
                trainDiv.style.top = `${trainY - 12.5 + 5}px`; // +5pxで微調整
                
                // 運行支障時のツールチップ内容を画像風に生成
                const tooltipContentHtml = `
                    <h3>運行状況</h3>
                    <div class="sub-text">並びは発着順ではありません</div>
                    <div class="train-info-section">
                        <span class="train-type-label">${train.type}</span>
                        <div class="train-main-info">${stations.find(s=>s.id === issue.stationId).name}駅 <span>停車中</span></div>
                    </div>
                    <div class="delay-status" style="color: var(--stop-color);">運行支障: ${issue.reason}</div>
                    ${train.comfortIndex !== undefined && comfortLevels[train.comfortIndex] ? `<div class="comfort-index-section"><b>混雑度:</b> <span class="${comfortClassMap[train.comfortIndex]}">${comfortLevels[train.comfortIndex]}</span></div>` : ''}
                    <div class="disclaimer">● 実際の列車情報と異なる場合があります</div>
                `;
                
                // イベントリスナーの追加 (クリックで表示、他の場所をクリックで非表示)
                trainDiv.addEventListener('click', (e) => { e.stopPropagation(); showTooltip(e.target, tooltipContentHtml); });
                trainListDiv.appendChild(trainDiv);
                // console.log(`列車 ${train.trainId}: 運行支障により表示 (駅ID: ${issue.stationId})`);
                return; // 支障がある場合はここで終了
            }

            let trainRendered = false; // 現在の列車が描画されたかどうかのフラグ

            // 2. 時刻表を走査して列車の状態と位置を決定
            for (let i = 0; i < train.timetable.length; i++) {
                const currentStop = train.timetable[i];
                const nextStop = train.timetable[i + 1];

                const arrivalTime = parseTime(currentStop.arrival);
                const departureTime = parseTime(currentStop.departure);

                // --- 状況判定とアイコン表示ロジック ---

                // A. 終着駅に到着済み (代行輸送を除く)
                if (i === train.timetable.length - 1 && arrivalTime && train.type !== '代行輸送') {
                    const oneMinuteAfterArrival = new Date(arrivalTime.getTime() + 1 * 60 * 1000);
                    // console.log(`  終着駅判定 - 列車ID: ${train.trainId}, 到着時刻: ${arrivalTime.toLocaleTimeString('ja-JP')}, 1分後: ${oneMinuteAfterArrival.toLocaleTimeString('ja-JP')}`);
                    if (now >= arrivalTime && now <= oneMinuteAfterArrival) {
                        const stationElem = document.getElementById(`station-${currentStop.stationId}`);
                        if (!stationElem) {
                            // console.warn(`  終着駅要素が見つかりません: station-${currentStop.stationId}`);
                            continue;
                        }
                        const trainY = stationElem.offsetTop + stationElem.offsetHeight / 2;
                        const trainDiv = document.createElement('div');
                        trainDiv.className = 'train waiting-image';
                        trainDiv.innerHTML = `<img src="${imagePaths.waiting}" alt="停車中(定刻)" style="width: 25px; height: 25px;">`;
                        trainDiv.style.top = `${trainY - 12.5 + 5}px`; // +5pxで微調整
                        
                        // 終着駅到着時のツールチップ内容を画像風に生成
                        const tooltipContentHtml = `
                            <h3>運行状況</h3>
                            <div class="sub-text">並びは発着順ではありません</div>
                            <div class="train-info-section">
                                <span class="train-type-label">${train.type}</span>
                                <div class="train-main-info">${stations.find(s=>s.id === currentStop.stationId).name}駅 <span>到着済</span></div>
                            </div>
                            ${train.comfortIndex !== undefined && comfortLevels[train.comfortIndex] ? `<div class="comfort-index-section"><b>混雑度:</b> <span class="${comfortClassMap[train.comfortIndex]}">${comfortLevels[train.comfortIndex]}</span></div>` : ''}
                            <div class="disclaimer">● 実際の列車情報と異なる場合があります</div>
                        `;
                        
                        // イベントリスナーの追加
                        trainDiv.addEventListener('click', (e) => { e.stopPropagation(); showTooltip(e.target, tooltipContentHtml); });
                        trainListDiv.appendChild(trainDiv);
                        // console.log(`列車 ${train.trainId}: 到着済 (駅ID: ${currentStop.stationId})`);
                        trainRendered = true;
                        break;
                    }
                }

                // B. 始発駅で発車待機中 (代行輸送を除く)
                if (i === 0 && departureTime && train.type !== '代行輸送') {
                    const threeMinutesBeforeDeparture = new Date(departureTime.getTime() - 3 * 60 * 1000);
                    // console.log(`  始発駅判定 - 列車ID: ${train.trainId}, 出発時刻: ${departureTime.toLocaleTimeString('ja-JP')}, 3分前: ${threeMinutesBeforeDeparture.toLocaleTimeString('ja-JP')}`);
                    if (now >= threeMinutesBeforeDeparture && now <= departureTime) {
                        const stationElem = document.getElementById(`station-${currentStop.stationId}`);
                        if (!stationElem) {
                            // console.warn(`  始発駅要素が見つかりません: station-${currentStop.stationId}`);
                            continue;
                        }
                        const trainY = stationElem.offsetTop + stationElem.offsetHeight / 2;
                        const trainDiv = document.createElement('div');
                        trainDiv.className = 'train waiting-image';
                        trainDiv.innerHTML = `<img src="${imagePaths.waiting}" alt="停車中(定刻)" style="width: 25px; height: 25px;">`;
                        trainDiv.style.top = `${trainY - 12.5 + 5}px`; // +5pxで微調整
                        
                        // 始発駅待機中のツールチップ内容を画像風に生成
                        const tooltipContentHtml = `
                            <h3>運行状況</h3>
                            <div class="sub-text">並びは発着順ではありません</div>
                            <div class="train-info-section">
                                <span class="train-type-label">${train.type}</span>
                                <div class="train-main-info">${stations.find(s=>s.id === currentStop.stationId).name}駅 <span>発車待機中</span></div>
                            </div>
                            ${train.comfortIndex !== undefined && comfortLevels[train.comfortIndex] ? `<div class="comfort-index-section"><b>混雑度:</b> <span class="${comfortClassMap[train.comfortIndex]}">${comfortLevels[train.comfortIndex]}</span></div>` : ''}
                            <div class="disclaimer">● 実際の列車情報と異なる場合があります</div>
                        `;
                        
                        // イベントリスナーの追加
                        trainDiv.addEventListener('click', (e) => { e.stopPropagation(); showTooltip(e.target, tooltipContentHtml); });
                        trainListDiv.appendChild(trainDiv);
                        // console.log(`列車 ${train.trainId}: 発車待機中 (駅ID: ${currentStop.stationId})`);
                        trainRendered = true;
                        break;
                    }
                }

                // C. 駅で停車中 (通常の停車、上記A, B以外)
                if (arrivalTime && departureTime && trainTime >= arrivalTime && trainTime < departureTime) {
                    const stationElem = document.getElementById(`station-${currentStop.stationId}`);
                    if (!stationElem) {
                        // console.warn(`  停車中駅要素が見つかりません: station-${currentStop.stationId}`);
                        continue;
                    }
                    const trainY = stationElem.offsetTop + stationElem.offsetHeight / 2;
                    const trainDiv = document.createElement('div');
                    trainDiv.className = 'train waiting-image';
                    trainDiv.innerHTML = `<img src="${imagePaths.waiting}" alt="停車中(定刻)" style="width: 25px; height: 25px;">`;
                    trainDiv.style.top = `${trainY - 12.5 + 5}px`; // +5pxで微調整
                    
                    // 駅停車中のツールチップ内容を画像風に生成
                    const tooltipContentHtml = `
                        <h3>運行状況</h3>
                        <div class="sub-text">並びは発着順ではありません</div>
                        <div class="train-info-section">
                            <span class="train-type-label">${train.type}</span>
                            <div class="train-main-info">${stations.find(s=>s.id === currentStop.stationId).name}駅 <span>停車中</span></div>
                        </div>
                        ${train.comfortIndex !== undefined && comfortLevels[train.comfortIndex] ? `<div class="comfort-index-section"><b>混雑度:</b> <span class="${comfortClassMap[train.comfortIndex]}">${comfortLevels[train.comfortIndex]}</span></div>` : ''}
                        <div class="disclaimer">● 実際の列車情報と異なる場合があります</div>
                    `;
                    
                    // イベントリスナーの追加
                    trainDiv.addEventListener('click', (e) => { e.stopPropagation(); showTooltip(e.target, tooltipContentHtml); });
                    trainListDiv.appendChild(trainDiv);
                    // console.log(`列車 ${train.trainId}: 駅で停車中 (駅ID: ${currentStop.stationId})`);
                    trainRendered = true;
                    break;
                }

                // D. 駅間を走行中
                if (departureTime && nextStop) {
                    const nextArrivalTime = parseTime(nextStop.arrival);
                    if (nextArrivalTime && trainTime >= departureTime && trainTime < nextArrivalTime) {
                        const isSuspended = suspendedSections.some(section => isSectionSuspendedNow(section, now) && [section.fromStationId, section.toStationId].sort((a,b)=>a-b).join() === [currentStop.stationId, nextStop.stationId].sort((a,b)=>a-b).join());
                        if (isSuspended) {
                            // console.log(`列車 ${train.trainId}: 運休区間を走行中のため表示されません。`);
                            trainRendered = true;
                            break;
                        }

                        const progress = (trainTime - departureTime) / (nextArrivalTime - departureTime);
                        const prevStationElem = document.getElementById(`station-${currentStop.stationId}`);
                        const nextStationElem = document.getElementById(`station-${nextStop.stationId}`);
                        if (!prevStationElem || !nextStationElem) {
                            // console.warn(`  駅間走行中 - 駅要素が見つかりません: prev-${currentStop.stationId}, next-${nextStop.stationId}`);
                            continue;
                        }

                        const prevStationY = prevStationElem.offsetTop + prevStationElem.offsetHeight / 2;
                        const nextStationY = nextStationElem.offsetTop + nextStationElem.offsetHeight / 2;
                        const trainY = prevStationY + (nextStationY - prevStationY) * progress;

                        const trainDiv = document.createElement('div');
                        let imgSrc = '';
                        let altText = '';
                        let className = 'train';
                        let delayStatusText = '';
                        let delayStatusColor = '';
                        let overlayText = ''; // オーバーレイテキスト
                        let overlayClass = ''; // オーバーレイのクラス

                        if (train.type === '代行輸送') {
                            className += train.direction === 'up' ? ' substitute-up-image' : ' substitute-down-image';
                            imgSrc = train.direction === 'up' ? imagePaths.substitute_up : imagePaths.substitute_down;
                            altText = `代行輸送 ${train.direction === 'up' ? '上り' : '下り'}`;
                            delayStatusText = '代行輸送中';
                            delayStatusColor = 'var(--info-icon-color)'; // 代行輸送は青系
                        } else {
                            if (train.delayMinutes > 0) {
                                delayStatusText = `${train.delayMinutes}分遅れ`;
                                delayStatusColor = 'var(--delay-color)';
                                className += train.direction === 'up' ? ' delayed-up-image' : ' delayed-down-image';
                                imgSrc = train.direction === 'up' ? imagePaths.delayed_up : imagePaths.delayed_down;
                                altText = `遅延 ${train.direction === 'up' ? '上り' : '下り'}`;
                                overlayText = `+${train.delayMinutes}`; // 遅延時のオーバーレイテキスト
                                overlayClass = 'delay'; // 遅延時のオーバーレイクラス
                            } else if (train.delayMinutes < 0) {
                                delayStatusText = `${Math.abs(train.delayMinutes)}分早発`;
                                delayStatusColor = 'var(--early-color)'; // 早発は水色
                                className += train.direction === 'up' ? ' up-image' : ' down-image'; // 早発時は通常の矢印
                                imgSrc = train.direction === 'up' ? imagePaths.up : imagePaths.down;
                                altText = train.direction === 'up' ? '上り' : '下り';
                                overlayText = `-${Math.abs(train.delayMinutes)}`; // 早発時のオーバーレイテキスト
                                overlayClass = 'early'; // 早発時のオーバーレイクラス
                            } else {
                                delayStatusText = '定刻通り';
                                delayStatusColor = 'var(--up-train-color)'; // 定刻は上り/下りの色に合わせる
                                className += train.direction === 'up' ? ' up-image' : ' down-image';
                                imgSrc = train.direction === 'up' ? imagePaths.up : imagePaths.down;
                                altText = train.direction === 'up' ? '上り' : '下り';
                                // 定刻の場合はオーバーレイテキストなし
                            }
                        }
                        
                        trainDiv.className = className;
                        // innerHTMLにオーバーレイ要素を追加
                        trainDiv.innerHTML = `
                            <img src="${imgSrc}" alt="${altText}" style="width: 25px; height: 25px;">
                            ${overlayText ? `<div class="train-status-overlay ${overlayClass}">${overlayText}</div>` : ''}
                        `;
                        trainDiv.style.top = `${trainY - 12.5 + 5}px`; // +5pxで微調整
                        
                        // 駅間走行中のツールチップ内容を画像風に生成
                        const tooltipContentHtml = `
                            <h3>運行状況</h3>
                            <div class="sub-text">並びは発着順ではありません</div>
                            <div class="train-info-section">
                                <span class="train-type-label">${train.type}</span>
                                <div class="train-main-info">${train.destination}<span>行き</span></div>
                            </div>
                            <div class="delay-status" style="color: ${delayStatusColor};">${delayStatusText}</div>
                            ${train.comfortIndex !== undefined && comfortLevels[train.comfortIndex] ? `<div class="comfort-index-section"><b>混雑度:</b> <span class="${comfortClassMap[train.comfortIndex]}">${comfortLevels[train.comfortIndex]}</span></div>` : ''}
                            ${nextStop.arrival ? `<div class="next-station-arrival">次駅 <span>${stations.find(s=>s.id === nextStop.stationId).name}駅</span> 到着予定: <span>${nextStop.arrival}</span></div>` : ''}
                            <div class="disclaimer">● 実際の列車情報と異なる場合があります</div>
                        `;
                        
                        // イベントリスナーの追加
                        trainDiv.addEventListener('click', (e) => { e.stopPropagation(); showTooltip(e.target, tooltipContentHtml); });
                        trainListDiv.appendChild(trainDiv);
                        // console.log(`列車 ${train.trainId}: 駅間走行中 (${stations.find(s=>s.id === currentStop.stationId).name} -> ${stations.find(s=>s.id === nextStop.stationId).name})`);
                        trainRendered = true;
                        break;
                    }
                }
            }

            if (!trainRendered) {
                // console.log(`列車 ${train.trainId}: 現在の時刻では表示条件を満たしませんでした。`);
            }
        });
    }
    
    // --- 初期化と実行 ---
    renderAnnouncements();
    renderStations();
    updatePositions();
    setInterval(updatePositions, 5000);
});
