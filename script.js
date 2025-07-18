document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM要素の取得 ---
    const stationListDiv = document.getElementById('station-list');
    const trainListDiv = document.getElementById('train-list');
    const suspensionListDiv = document.getElementById('suspension-list');
    const currentTimeDiv = document.getElementById('current-time');
    const announcementsDiv = document.getElementById('announcements-board');
    const tooltip = document.getElementById('tooltip');
    const legendUpIcon = document.querySelector('.legend-icon.up');
    const legendDownIcon = document.querySelector('.legend-icon.down');
    const legendWaitingIcon = document.querySelector('.legend-icon.waiting');
    const legendStoppedIcon = document.querySelector('.legend-icon.stopped');
    const legendSubstituteIcon = document.querySelector('.legend-icon.substitute'); // 代行輸送の凡例
    const sanyoLineBranch = document.getElementById('sanyo-line-branch');

    // 画像パスの定義
    // これらの画像ファイルが 'images/' ディレクトリに存在することを前提としています。
    // もし画像が見つからない場合、アイコンが表示されないことがあります。
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
    legendWaitingIcon.innerHTML = `<img src="${imagePaths.waiting}" alt="乗降中" style="width: 25px; height: 25px;">`;
    legendStoppedIcon.innerHTML = `<img src="${imagePaths.stopped}" alt="運行支障" style="width: 25px; height: 25px;">`;
    legendSubstituteIcon.innerHTML = `<img src="${imagePaths.substitute_down}" alt="代行輸送" style="width: 25px; height: 25px;">`; // 代行輸送は下りバスアイコンを例に

    // --- データ定義 ---
    const announcements = [
        {id: 'info2', type: 'info', message:"この走行位置は2025年度改正のダイヤに準拠しています。"},
        {id: 'info3', type: 'info', message:'遅延情報は、複数列車が10分以上遅延したときに反映されます。'},
        {id: 'info4', type: 'suspended', message:'山陰線では、大雨のため黒井村駅～幡生駅間で徐行運転をしています。このため、列車に５～３０分の遅れがでています。'},
    ];
    const operationalIssues = [
        //{ trainId: '449D', stationId: 6, reason: '車両の確認' }
    ];
    const suspendedSections = [
        // 運休区間を表示したい場合はコメントを解除し、適切な区間を設定してください
        // { fromStationId: 7, toStationId: 10, reason: '大雨による土砂災害のため、梅ヶ峠～小串駅間で終日運転を見合わせています。' },
        // { fromStationId: 2, toStationId: 4, reason: '線路保守工事のため、9時～17時の間、綾羅木～安岡駅間で運転を見合わせます。', startTime: '09:00', endTime: '17:00' }
    ];
    // NEW: お知らせ範囲のデータ
    const infoRangeSections = [
        { fromStationId: 0, toStationId: 10, reason: 'この区間は大雨のため、速度を落として運転しています。', startTime: '06:00', endTime: '23:00' },
        //{ fromStationId: 1, toStationId: 3, reason: '幡生駅構内での車両点検のため、一部列車に遅れが発生する可能性があります。', startTime: '00:00', endTime: '23:59' }
    ];

    const stations = [
        { id: 0, name: '下関', iconUrl: 'images/sanyo.png' },
        { id: 1, name: '幡生', iconUrl: 'images/sanin-yo.png' },
        { id: 2, name: '綾羅木', iconUrl: 'images/sanin.png' },
        { id: 3, name: '梶栗郷台地', iconUrl: 'images/sanin.png' },
        { id: 4, name: '安岡', iconUrl: 'images/sanin.png' },
        { id: 5, name: '福江', iconUrl: 'images/sanin.png' },
        { id: 6, name: '吉見', iconUrl: 'images/sanin.png' },
        { id: 7, name: '梅ヶ峠', iconUrl: 'images/sanin.png' },
        { id: 8, name: '黒井村', iconUrl: 'images/sanin.png' },
        { id: 9, name: '川棚温泉', iconUrl: 'images/sanin.png' },
        { id: 10, name: '小串', iconUrl: 'images/sanin.png' },
        { id: 11, name: '湯玉', iconUrl: 'images/sanin.png' },
        { id: 12, name: '宇賀本郷', iconUrl: 'images/sanin.png' },
        { id: 13, name: '長門二見', iconUrl: 'images/sanin.png' },
        { id: 14, name: '滝部', iconUrl: 'images/sanin.png' }
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
        4: 'comfort-value-very-crowded',
        // comfortIndexが未定義の場合
        undefined: 'comfort-value-unknown'
    };

    // NEW: 全体の列車進行速度を調整する変数 (パーセンテージで指定)
    // 例: 100 = 通常速度, 50 = 半分の速度 (徐行運転)
    let globalSlowOperationPercentage = 100; // デフォルトは通常速度

    // 列車時刻表データ (ユーザー提供のデータ)
    const trainSchedules = [
        /// Takibe to Shimonoseki
        {"trainId":"821R","type":"代行輸送","direction":"down","destination":"小串","delayMinutes":0,"timetable":[{"stationId":14,"departure":"06:35"},{"stationId":13,"arrival":"06:42","departure":"06:43"},{"stationId":12,"arrival":"06:47","departure":"06:48"},{"stationId":11,"arrival":"06:51","departure":"06:52"},{"stationId":10,"arrival":"07:00"}]},
        {"trainId":"823R","type":"代行輸送","direction":"down","destination":"小串","delayMinutes":0,"timetable":[{"stationId":14,"departure":"06:57"},{"stationId":13,"arrival":"07:04","departure":"07:05"},{"stationId":12,"arrival":"07:09","departure":"07:10"},{"stationId":11,"arrival":"07:13","departure":"07:14"},{"stationId":10,"arrival":"07:22"}]},
        {"trainId":"1825D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":10,"departure":"06:58"},{"stationId":9,"arrival":"07:05","departure":"07:06"},{"stationId":8,"arrival":"07:13","departure":"07:14"},{"stationId":7,"arrival":"07:17","departure":"07:18"},{"stationId":6,"arrival":"07:25","departure":"07:26"},{"stationId":5,"arrival":"07:34","departure":"07:35"},{"stationId":4,"arrival":"07:38","departure":"07:39"},{"stationId":3,"arrival":"07:44","departure":"07:45"},{"stationId":2,"arrival":"07:49","departure":"07:50"},{"stationId":1,"arrival":"07:55","departure":"07:56"},{"stationId":0,"arrival":"07:59"}]},
        {"trainId":"825D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":14,"departure":"08:00"},{"stationId":13,"arrival":"08:07","departure":"08:08"},{"stationId":12,"arrival":"08:15","departure":"08:16"},{"stationId":11,"arrival":"08:19","departure":"08:20"},{"stationId":10,"arrival":"08:26","departure":"08:27"},{"stationId":9,"arrival":"08:36","departure":"08:37"},{"stationId":8,"arrival":"08:41","departure":"08:42"},{"stationId":7,"arrival":"08:46","departure":"08:47"},{"stationId":6,"arrival":"08:51","departure":"08:52"},{"stationId":5,"arrival":"08:55","departure":"08:56"},{"stationId":4,"arrival":"08:59","departure":"09:00"},{"stationId":3,"arrival":"09:03","departure":"09:04"},{"stationId":2,"arrival":"09:06","departure":"09:07"},{"stationId":1,"arrival":"09:11","departure":"09:12"},{"stationId":0,"arrival":"09:17"}]},
        {"trainId":"1827R","type":"代行輸送","direction":"down","destination":"小串","delayMinutes":0,"timetable":[{"stationId":14,"departure":"08:18"},{"stationId":13,"arrival":"08:25","departure":"08:26"},{"stationId":12,"arrival":"08:30","departure":"08:31"},{"stationId":11,"arrival":"08:34","departure":"08:35"},{"stationId":10,"arrival":"08:43"}]},
        {"trainId":"1829D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":14,"departure":"08:46"},{"stationId":13,"arrival":"08:54","departure":"08:55"},{"stationId":12,"arrival":"09:01","departure":"09:02"},{"stationId":11,"arrival":"09:05","departure":"09:06"},{"stationId":10,"arrival":"09:13","departure":"09:14"},{"stationId":9,"arrival":"09:18","departure":"09:19"},{"stationId":8,"arrival":"09:22","departure":"09:23"},{"stationId":7,"arrival":"09:27","departure":"09:28"},{"stationId":6,"arrival":"09:33","departure":"09:34"},{"stationId":5,"arrival":"09:37","departure":"09:38"},{"stationId":4,"arrival":"09:41","departure":"09:42"},{"stationId":3,"arrival":"09:44","departure":"09:45"},{"stationId":2,"arrival":"09:47","departure":"09:48"},{"stationId":1,"arrival":"09:52","departure":"09:53"},{"stationId":0,"arrival":"09:59"}]},
        {"trainId":"1831R","type":"代行輸送","direction":"down","destination":"小串","delayMinutes":0,"timetable":[{"stationId":14,"departure":"09:11"},{"stationId":13,"arrival":"09:18","departure":"09:19"},{"stationId":12,"arrival":"09:23","departure":"09:24"},{"stationId":11,"arrival":"09:27","departure":"09:28"},{"stationId":10,"arrival":"09:36"}]},
        {"trainId":"1833R","type":"代行輸送","direction":"down","destination":"小串","delayMinutes":0,"timetable":[{"stationId":14,"departure":"11:33"},{"stationId":13,"arrival":"11:40","departure":"11:41"},{"stationId":12,"arrival":"11:45","departure":"11:46"},{"stationId":11,"arrival":"11:49","departure":"11:50"},{"stationId":10,"arrival":"11:58"}]},
        {"trainId":"1835R","type":"代行輸送","direction":"down","destination":"小串","delayMinutes":0,"timetable":[{"stationId":14,"departure":"13:13"},{"stationId":13,"arrival":"13:20","departure":"13:21"},{"stationId":12,"arrival":"13:25","departure":"13:26"},{"stationId":11,"arrival":"13:29","departure":"13:30"},{"stationId":10,"arrival":"13:38"}]},
        {"trainId":"1837R","type":"代行輸送","direction":"down","destination":"小串","delayMinutes":0,"timetable":[{"stationId":14,"departure":"14:24"},{"stationId":13,"arrival":"14:31","departure":"14:32"},{"stationId":12,"arrival":"14:36","departure":"14:37"},{"stationId":11,"arrival":"14:40","departure":"14:41"},{"stationId":10,"arrival":"14:49"}]},
        {"trainId":"837D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":14,"departure":"16:09"},{"stationId":13,"arrival":"16:17","departure":"16:18"},{"stationId":12,"arrival":"16:24","departure":"16:25"},{"stationId":11,"arrival":"16:28","departure":"16:29"},{"stationId":10,"arrival":"16:36","departure":"16:37"},{"stationId":9,"arrival":"16:41","departure":"16:42"},{"stationId":8,"arrival":"16:45","departure":"16:46"},{"stationId":7,"arrival":"16:50","departure":"16:51"},{"stationId":6,"arrival":"16:55","departure":"16:56"},{"stationId":5,"arrival":"17:00","departure":"17:01"},{"stationId":4,"arrival":"17:04","departure":"17:05"},{"stationId":3,"arrival":"17:09","departure":"17:10"},{"stationId":2,"arrival":"17:12","departure":"17:13"},{"stationId":1,"arrival":"17:17","departure":"17:18"},{"stationId":0,"arrival":"17:25"}]},
        {"trainId":"1839R","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":4,"departure":"16:45"},{"stationId":3,"arrival":"16:52","departure":"16:53"},{"stationId":2,"arrival":"16:57","departure":"16:58"},{"stationId":1,"arrival":"17:01","departure":"17:02"},{"stationId":0,"arrival":"17:10"}]},
        {"trainId":"839D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":14,"departure":"17:29"},{"stationId":13,"arrival":"17:36","departure":"17:37"},{"stationId":12,"arrival":"17:44","departure":"17:45"},{"stationId":11,"arrival":"17:48","departure":"17:49"},{"stationId":10,"arrival":"17:55","departure":"17:56"},{"stationId":9,"arrival":"18:00","departure":"18:01"},{"stationId":8,"arrival":"18:04","departure":"18:05"},{"stationId":7,"arrival":"18:10","departure":"18:11"},{"stationId":6,"arrival":"18:15","departure":"18:16"},{"stationId":5,"arrival":"18:19","departure":"18:20"},{"stationId":4,"arrival":"18:23","departure":"18:24"},{"stationId":3,"arrival":"18:26","departure":"18:27"},{"stationId":2,"arrival":"18:29","departure":"18:30"},{"stationId":1,"arrival":"18:34","departure":"18:35"},{"stationId":0,"arrival":"18:40"}]},
        {"trainId":"1841R","type":"代行輸送","direction":"down","destination":"小串","delayMinutes":0,"timetable":[{"stationId":14,"departure":"17:55"},{"stationId":13,"arrival":"18:02","departure":"18:03"},{"stationId":12,"arrival":"18:07","departure":"18:08"},{"stationId":11,"arrival":"18:11","departure":"18:12"},{"stationId":10,"arrival":"18:20"}]},
        {"trainId":"1843D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":14,"departure":"19:10"},{"stationId":13,"arrival":"19:17","departure":"19:18"},{"stationId":12,"arrival":"19:25","departure":"19:26"},{"stationId":11,"arrival":"19:29","departure":"19:30"},{"stationId":10,"arrival":"19:36","departure":"19:37"},{"stationId":9,"arrival":"19:41","departure":"19:42"},{"stationId":8,"arrival":"19:44","departure":"19:45"},{"stationId":7,"arrival":"19:50","departure":"19:51"},{"stationId":6,"arrival":"19:55","departure":"19:56"},{"stationId":5,"arrival":"19:59","departure":"20:00"},{"stationId":4,"arrival":"20:03","departure":"20:04"},{"stationId":3,"arrival":"20:06","departure":"20:07"},{"stationId":2,"arrival":"20:09","departure":"20:10"},{"stationId":1,"arrival":"20:14","departure":"20:15"},{"stationId":0,"arrival":"20:20"}]},
        {"trainId":"843R","type":"代行輸送","direction":"down","destination":"小串","delayMinutes":0,"timetable":[{"stationId":14,"departure":"19:35"},{"stationId":13,"arrival":"19:42","departure":"19:43"},{"stationId":12,"arrival":"19:47","departure":"19:48"},{"stationId":11,"arrival":"19:51","departure":"19:52"},{"stationId":10,"arrival":"20:00"}]},
        {"trainId":"1845D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":14,"departure":"20:39"},{"stationId":13,"arrival":"20:46","departure":"20:47"},{"stationId":12,"arrival":"20:55","departure":"20:56"},{"stationId":11,"arrival":"20:59","departure":"21:00"},{"stationId":10,"arrival":"21:06","departure":"21:07"},{"stationId":9,"arrival":"21:14","departure":"21:15"},{"stationId":8,"arrival":"21:17","departure":"21:18"},{"stationId":7,"arrival":"21:23","departure":"21:24"},{"stationId":6,"arrival":"21:28","departure":"21:29"},{"stationId":5,"arrival":"21:37","departure":"21:38"},{"stationId":4,"arrival":"21:41","departure":"21:42"},{"stationId":3,"arrival":"21:43","departure":"21:44"},{"stationId":2,"arrival":"21:46","departure":"21:47"},{"stationId":1,"arrival":"21:51","departure":"21:52"},{"stationId":0,"arrival":"21:57"}]},
        {"trainId":"1847R","type":"代行輸送","direction":"down","destination":"小串","delayMinutes":0,"timetable":[{"stationId":14,"departure":"21:15"},{"stationId":13,"arrival":"21:22","departure":"21:23"},{"stationId":12,"arrival":"21:27","departure":"21:28"},{"stationId":11,"arrival":"21:31","departure":"21:32"},{"stationId":10,"arrival":"21:40"}]},
        {"trainId":"1849D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":14,"departure":"21:58"},{"stationId":13,"arrival":"22:06","departure":"22:07"},{"stationId":12,"arrival":"22:14","departure":"22:15"},{"stationId":11,"arrival":"22:19","departure":"22:20"},{"stationId":10,"arrival":"22:26","departure":"22:27"},{"stationId":9,"arrival":"22:31","departure":"22:32"},{"stationId":8,"arrival":"22:34","departure":"22:35"},{"stationId":7,"arrival":"22:40","departure":"22:41"},{"stationId":6,"arrival":"22:45","departure":"22:46"},{"stationId":5,"arrival":"22:49","departure":"22:50"},{"stationId":4,"arrival":"22:53","departure":"22:54"},{"stationId":3,"arrival":"22:56","departure":"22:57"},{"stationId":2,"arrival":"22:59","departure":"23:00"},{"stationId":1,"arrival":"23:04","departure":"23:05"},{"stationId":0,"arrival":"23:10"}]},
        
        
        {"trainId":"420D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":10,"departure":"05:45"},{"stationId":9,"arrival":"05:49","departure":"05:50"},{"stationId":8,"arrival":"05:52","departure":"05:53"},{"stationId":7,"arrival":"05:58","departure":"05:59"},{"stationId":6,"arrival":"06:03","departure":"06:04"},{"stationId":5,"arrival":"06:08","departure":"06:09"},{"stationId":4,"arrival":"06:12","departure":"06:13"},{"stationId":3,"arrival":"06:14","departure":"06:15"},{"stationId":2,"arrival":"06:17","departure":"06:18"},{"stationId":1,"arrival":"06:22","departure":"06:23"},{"stationId":0,"arrival":"06:28"}]},
        {"trainId":"426D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":10,"departure":"06:28"},{"stationId":9,"arrival":"06:32","departure":"06:33"},{"stationId":8,"arrival":"06:36","departure":"06:37"},{"stationId":7,"arrival":"06:41","departure":"06:42"},{"stationId":6,"arrival":"06:47","departure":"06:48"},{"stationId":5,"arrival":"06:51","departure":"06:52"},{"stationId":4,"arrival":"06:55","departure":"06:56"},{"stationId":3,"arrival":"06:58","departure":"06:59"},{"stationId":2,"arrival":"07:01","departure":"07:02"},{"stationId":1,"arrival":"07:06","departure":"07:07"},{"stationId":0,"arrival":"07:13"}]},
        {"trainId":"429D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":10,"departure":"06:46"},{"stationId":9,"arrival":"06:50","departure":"06:51"},{"stationId":8,"arrival":"06:54","departure":"06:55"},{"stationId":7,"arrival":"07:00","departure":"07:01"},{"stationId":6,"arrival":"07:05","departure":"07:06"},{"stationId":5,"arrival":"07:12","departure":"07:13"},{"stationId":4,"arrival":"07:16","departure":"07:17"},{"stationId":3,"arrival":"07:20","departure":"07:21"},{"stationId":2,"arrival":"07:23","departure":"07:24"},{"stationId":1,"arrival":"07:28","departure":"07:29"},{"stationId":0,"arrival":"07:35"}]},
        {"trainId":"431D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":10,"departure":"07:07"},{"stationId":9,"arrival":"07:11","departure":"07:12"},{"stationId":8,"arrival":"07:16","departure":"07:17"},{"stationId":7,"arrival":"07:21","departure":"07:22"},{"stationId":6,"arrival":"07:27","departure":"07:28"},{"stationId":5,"arrival":"07:34","departure":"07:35"},{"stationId":4,"arrival":"07:38","departure":"07:39"},{"stationId":3,"arrival":"07:44","departure":"07:45"},{"stationId":2,"arrival":"07:47","departure":"07:48"},{"stationId":1,"arrival":"07:53","departure":"07:54"},{"stationId":0,"arrival":"07:59"}]},
        {"trainId":"435D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":10,"departure":"07:54"},{"stationId":9,"arrival":"07:58","departure":"07:59"},{"stationId":8,"arrival":"08:02","departure":"08:03"},{"stationId":7,"arrival":"08:07","departure":"08:08"},{"stationId":6,"arrival":"08:13","departure":"08:14"},{"stationId":5,"arrival":"08:17","departure":"08:18"},{"stationId":4,"arrival":"08:21","departure":"08:22"},{"stationId":3,"arrival":"08:25","departure":"08:26"},{"stationId":2,"arrival":"08:28","departure":"08:29"},{"stationId":1,"arrival":"08:33","departure":"08:34"},{"stationId":0,"arrival":"08:42"}]},
        {"trainId":"437D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":10,"departure":"09:53"},{"stationId":9,"arrival":"09:57","departure":"09:58"},{"stationId":8,"arrival":"10:01","departure":"10:02"},{"stationId":7,"arrival":"10:06","departure":"10:07"},{"stationId":6,"arrival":"10:11","departure":"10:12"},{"stationId":5,"arrival":"10:16","departure":"10:17"},{"stationId":4,"arrival":"10:20","departure":"10:21"},{"stationId":3,"arrival":"10:23","departure":"10:24"},{"stationId":2,"arrival":"10:26","departure":"10:27"},{"stationId":1,"arrival":"10:31","departure":"10:32"},{"stationId":0,"arrival":"10:37"}]},
        {"trainId":"439D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":10,"departure":"11:02"},{"stationId":9,"arrival":"11:06","departure":"11:07"},{"stationId":8,"arrival":"11:10","departure":"11:11"},{"stationId":7,"arrival":"11:15","departure":"11:16"},{"stationId":6,"arrival":"11:20","departure":"11:21"},{"stationId":5,"arrival":"11:25","departure":"11:26"},{"stationId":4,"arrival":"11:29","departure":"11:30"},{"stationId":3,"arrival":"11:31","departure":"11:32"},{"stationId":2,"arrival":"11:34","departure":"11:35"},{"stationId":1,"arrival":"11:39","departure":"11:40"},{"stationId":0,"arrival":"11:45"}]},
        {"trainId":"441D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":10,"departure":"12:11"},{"stationId":9,"arrival":"12:15","departure":"12:16"},{"stationId":8,"arrival":"12:18","departure":"12:19"},{"stationId":7,"arrival":"12:24","departure":"12:25"},{"stationId":6,"arrival":"12:29","departure":"12:30"},{"stationId":5,"arrival":"12:34","departure":"12:35"},{"stationId":4,"arrival":"12:38","departure":"12:39"},{"stationId":3,"arrival":"12:41","departure":"12:42"},{"stationId":2,"arrival":"12:44","departure":"12:45"},{"stationId":1,"arrival":"12:49","departure":"12:50"},{"stationId":0,"arrival":"12:54"}]},
        {"trainId":"443D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":10,"departure":"13:19"},{"stationId":9,"arrival":"13:23","departure":"13:24"},{"stationId":8,"arrival":"13:27","departure":"13:28"},{"stationId":7,"arrival":"13:32","departure":"13:33"},{"stationId":6,"arrival":"13:37","departure":"13:38"},{"stationId":5,"arrival":"13:42","departure":"13:43"},{"stationId":4,"arrival":"13:46","departure":"13:47"},{"stationId":3,"arrival":"13:49","departure":"13:50"},{"stationId":2,"arrival":"13:52","departure":"13:53"},{"stationId":1,"arrival":"13:57","departure":"13:58"},{"stationId":0,"arrival":"14:06"}]},
        {"trainId":"445D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":10,"departure":"14:20"},{"stationId":9,"arrival":"14:24","departure":"14:25"},{"stationId":8,"arrival":"14:28","departure":"14:29"},{"stationId":7,"arrival":"14:33","departure":"14:34"},{"stationId":6,"arrival":"14:38","departure":"14:39"},{"stationId":5,"arrival":"14:42","departure":"14:43"},{"stationId":4,"arrival":"14:46","departure":"14:47"},{"stationId":3,"arrival":"14:49","departure":"14:50"},{"stationId":2,"arrival":"14:52","departure":"14:53"},{"stationId":1,"arrival":"14:57","departure":"14:58"},{"stationId":0,"arrival":"15:03"}]},
        {"trainId":"447D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":10,"departure":"15:25"},{"stationId":9,"arrival":"15:29","departure":"15:30"},{"stationId":8,"arrival":"15:33","departure":"15:34"},{"stationId":7,"arrival":"15:38","departure":"15:39"},{"stationId":6,"arrival":"15:43","departure":"15:44"},{"stationId":5,"arrival":"15:48","departure":"15:49"},{"stationId":4,"arrival":"15:52","departure":"15:53"},{"stationId":3,"arrival":"15:55","departure":"15:56"},{"stationId":2,"arrival":"15:58","departure":"15:59"},{"stationId":1,"arrival":"16:03","departure":"16:04"},{"stationId":0,"arrival":"16:09"}]},
        {"trainId":"449D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":10,"departure":"17:18"},{"stationId":9,"arrival":"17:21","departure":"17:22"},{"stationId":8,"arrival":"17:25","departure":"17:26"},{"stationId":7,"arrival":"17:31","departure":"17:32"},{"stationId":6,"arrival":"17:36","departure":"17:37"},{"stationId":5,"arrival":"17:40","departure":"17:41"},{"stationId":4,"arrival":"17:44","departure":"17:45"},{"stationId":3,"arrival":"17:47","departure":"17:48"},{"stationId":2,"arrival":"17:50","departure":"17:51"},{"stationId":1,"arrival":"17:55","departure":"17:56"},{"stationId":0,"arrival":"18:02"}]},
        {"trainId":"451D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[{"stationId":10,"departure":"18:34"},{"stationId":9,"arrival":"18:38","departure":"18:39"},{"stationId":8,"arrival":"18:42","departure":"18:43"},{"stationId":7,"arrival":"18:47","departure":"18:48"},{"stationId":6,"arrival":"18:52","departure":"18:53"},{"stationId":5,"arrival":"18:57","departure":"18:58"},{"stationId":4,"arrival":"19:01","departure":"19:02"},{"stationId":3,"arrival":"19:04","departure":"19:05"},{"stationId":2,"arrival":"19:07","departure":"19:08"},{"stationId":1,"arrival":"19:12","departure":"19:13"},{"stationId":0,"arrival":"19:18"}]},
        
        //Shimonoseki to Kogushi-Takibe
        {"trainId":"1820D","type":"普通","direction":"up","destination":"滝部","delayMinutes":0,"timetable":[{"stationId":0,"departure":"05:40"},{"stationId":1,"arrival":"05:44","departure":"05:45"},{"stationId":2,"arrival":"05:49","departure":"05:50"},{"stationId":3,"arrival":"05:52","departure":"05:53"},{"stationId":4,"arrival":"05:55","departure":"05:56"},{"stationId":5,"arrival":"05:59","departure":"06:00"},{"stationId":6,"arrival":"06:03","departure":"06:04"},{"stationId":7,"arrival":"06:09","departure":"06:10"},{"stationId":8,"arrival":"06:14","departure":"06:15"},{"stationId":9,"arrival":"06:18","departure":"06:19"},{"stationId":10,"arrival":"06:22","departure":"06:23"},{"stationId":11,"arrival":"06:30","departure":"06:31"},{"stationId":12,"arrival":"06:35","departure":"06:36"},{"stationId":13,"arrival":"06:43","departure":"06:44"},{"stationId":14,"arrival":"06:51"}]},
        {"trainId":"1822D","type":"普通","direction":"up","destination":"滝部","delayMinutes":0,"timetable":[{"stationId":0,"departure":"06:40"},{"stationId":1,"arrival":"06:45","departure":"06:46"},{"stationId":2,"arrival":"06:49","departure":"06:50"},{"stationId":3,"arrival":"06:52","departure":"06:53"},{"stationId":4,"arrival":"06:55","departure":"06:56"},{"stationId":5,"arrival":"07:01","departure":"07:02"},{"stationId":6,"arrival":"07:05","departure":"07:06"},{"stationId":7,"arrival":"07:11","departure":"07:12"},{"stationId":8,"arrival":"07:16","departure":"07:17"},{"stationId":9,"arrival":"07:20","departure":"07:21"},{"stationId":10,"arrival":"07:24","departure":"07:25"},{"stationId":11,"arrival":"07:32","departure":"07:33"},{"stationId":12,"arrival":"07:36","departure":"07:37"},{"stationId":13,"arrival":"07:44","departure":"07:45"},{"stationId":14,"arrival":"07:53"}]},
        {"trainId":"822D","type":"普通","direction":"up","destination":"小串","delayMinutes":0,"timetable":[{"stationId":0,"departure":"07:01"},{"stationId":1,"arrival":"07:05","departure":"07:06"},{"stationId":2,"arrival":"07:11","departure":"07:12"},{"stationId":3,"arrival":"07:14","departure":"07:15"},{"stationId":4,"arrival":"07:17","departure":"07:18"},{"stationId":5,"arrival":"07:22","departure":"07:23"},{"stationId":6,"arrival":"07:27","departure":"07:28"},{"stationId":7,"arrival":"07:33","departure":"07:34"},{"stationId":8,"arrival":"07:38","departure":"07:39"},{"stationId":9,"arrival":"07:42","departure":"07:43"},{"stationId":10,"arrival":"07:47"}]},
        {"trainId":"1824D","type":"普通","direction":"up","destination":"滝部","delayMinutes":0,"timetable":[{"stationId":0,"departure":"07:26"},{"stationId":1,"arrival":"07:30","departure":"07:31"},{"stationId":2,"arrival":"07:35","departure":"07:36"},{"stationId":3,"arrival":"07:38","departure":"07:39"},{"stationId":4,"arrival":"07:41","departure":"07:42"},{"stationId":5,"arrival":"07:45","departure":"07:46"},{"stationId":6,"arrival":"07:50","departure":"07:51"},{"stationId":7,"arrival":"07:56","departure":"07:57"},{"stationId":8,"arrival":"08:01","departure":"08:02"},{"stationId":9,"arrival":"08:06","departure":"08:07"},{"stationId":10,"arrival":"08:10","departure":"08:11"},{"stationId":11,"arrival":"08:19","departure":"08:20"},{"stationId":12,"arrival":"08:23","departure":"08:24"},{"stationId":13,"arrival":"08:31","departure":"08:32"},{"stationId":14,"arrival":"08:39"}]},
        {"trainId":"1826D","type":"普通","direction":"up","destination":"小串","delayMinutes":0,"timetable":[{"stationId":0,"departure":"08:05"},{"stationId":1,"arrival":"08:10","departure":"08:11"},{"stationId":2,"arrival":"08:15","departure":"08:16"},{"stationId":3,"arrival":"08:18","departure":"08:19"},{"stationId":4,"arrival":"08:21","departure":"08:22"},{"stationId":5,"arrival":"08:26","departure":"08:27"},{"stationId":6,"arrival":"08:30","departure":"08:31"},{"stationId":7,"arrival":"08:36","departure":"08:37"},{"stationId":8,"arrival":"08:41","departure":"08:42"},{"stationId":9,"arrival":"08:45","departure":"08:46"},{"stationId":10,"arrival":"08:50"}]},
        {"trainId":"824D","type":"普通","direction":"up","destination":"小串","delayMinutes":0,"timetable":[{"stationId":0,"departure":"08:40"},{"stationId":1,"arrival":"08:45","departure":"08:46"},{"stationId":2,"arrival":"08:54","departure":"08:55"},{"stationId":3,"arrival":"08:57","departure":"08:58"},{"stationId":4,"arrival":"09:00","departure":"09:01"},{"stationId":5,"arrival":"09:04","departure":"09:05"},{"stationId":6,"arrival":"09:08","departure":"09:09"},{"stationId":7,"arrival":"09:14","departure":"09:15"},{"stationId":8,"arrival":"09:19","departure":"09:20"},{"stationId":9,"arrival":"09:26","departure":"09:27"},{"stationId":10,"arrival":"09:31"}]},
        {"trainId":"828D","type":"普通","direction":"up","destination":"小串","delayMinutes":0,"timetable":[{"stationId":0,"departure":"09:48"},{"stationId":1,"arrival":"09:52","departure":"09:53"},{"stationId":2,"arrival":"09:57","departure":"09:58"},{"stationId":3,"arrival":"10:00","departure":"10:01"},{"stationId":4,"arrival":"10:03","departure":"10:04"},{"stationId":5,"arrival":"10:07","departure":"10:08"},{"stationId":6,"arrival":"10:11","departure":"10:12"},{"stationId":7,"arrival":"10:17","departure":"10:18"},{"stationId":8,"arrival":"10:22","departure":"10:23"},{"stationId":9,"arrival":"10:26","departure":"10:27"},{"stationId":10,"arrival":"10:30"}]},
        {"trainId":"1830D","type":"普通","direction":"up","destination":"小串","delayMinutes":0,"timetable":[{"stationId":0,"departure":"10:36"},{"stationId":1,"arrival":"10:41","departure":"10:42"},{"stationId":2,"arrival":"10:46","departure":"10:47"},{"stationId":3,"arrival":"10:49","departure":"10:50"},{"stationId":4,"arrival":"10:51","departure":"10:52"},{"stationId":5,"arrival":"10:55","departure":"10:56"},{"stationId":6,"arrival":"11:00","departure":"11:01"},{"stationId":7,"arrival":"11:05","departure":"11:06"},{"stationId":8,"arrival":"11:10","departure":"11:11"},{"stationId":9,"arrival":"11:14","departure":"11:15"},{"stationId":10,"arrival":"11:18"}]},
        {"trainId":"830D","type":"普通","direction":"up","destination":"小串","delayMinutes":0,"timetable":[{"stationId":0,"departure":"13:14"},{"stationId":1,"arrival":"13:18","departure":"13:19"},{"stationId":2,"arrival":"13:24","departure":"13:25"},{"stationId":3,"arrival":"13:26","departure":"13:27"},{"stationId":4,"arrival":"13:29","departure":"13:30"},{"stationId":5,"arrival":"13:33","departure":"13:34"},{"stationId":6,"arrival":"13:37","departure":"13:38"},{"stationId":7,"arrival":"13:43","departure":"13:44"},{"stationId":8,"arrival":"13:48","departure":"13:49"},{"stationId":9,"arrival":"13:52","departure":"13:53"},{"stationId":10,"arrival":"13:57"}]},
        {"trainId":"1830D","type":"普通","direction":"up","destination":"滝部","delayMinutes":0,"timetable":[{"stationId":0,"departure":"14:31"},{"stationId":1,"arrival":"14:36","departure":"14:37"},{"stationId":2,"arrival":"14:41","departure":"14:42"},{"stationId":3,"arrival":"14:43","departure":"14:44"},{"stationId":4,"arrival":"14:46","departure":"14:47"},{"stationId":5,"arrival":"14:50","departure":"14:51"},{"stationId":6,"arrival":"14:54","departure":"14:55"},{"stationId":7,"arrival":"15:00","departure":"15:01"},{"stationId":8,"arrival":"15:05","departure":"15:06"},{"stationId":9,"arrival":"15:09","departure":"15:10"},{"stationId":10,"arrival":"15:13","departure":"15:14"},{"stationId":11,"arrival":"15:41","departure":"15:42"},{"stationId":12,"arrival":"15:45","departure":"15:46"},{"stationId":13,"arrival":"15:53","departure":"15:54"},{"stationId":14,"arrival":"16:02"}]},
        {"trainId":"1832D","type":"普通","direction":"up","destination":"小串","delayMinutes":0,"timetable":[{"stationId":0,"departure":"15:37"},{"stationId":1,"arrival":"15:41","departure":"15:42"},{"stationId":2,"arrival":"15:46","departure":"15:47"},{"stationId":3,"arrival":"15:49","departure":"15:50"},{"stationId":4,"arrival":"15:52","departure":"15:53"},{"stationId":5,"arrival":"15:56","departure":"15:57"},{"stationId":6,"arrival":"16:00","departure":"16:01"},{"stationId":7,"arrival":"16:06","departure":"16:07"},{"stationId":8,"arrival":"16:11","departure":"16:12"},{"stationId":9,"arrival":"16:15","departure":"16:16"},{"stationId":10,"arrival":"16:19"}]},
        {"trainId":"1834D","type":"普通","direction":"up","destination":"小串","delayMinutes":47,"timetable":[{"stationId":0,"departure":"16:48"},{"stationId":1,"arrival":"16:53","departure":"16:54"},{"stationId":2,"arrival":"16:58","departure":"16:59"},{"stationId":3,"arrival":"17:01","departure":"17:02"},{"stationId":4,"arrival":"17:04","departure":"17:05"},{"stationId":5,"arrival":"17:08","departure":"17:09"},{"stationId":6,"arrival":"17:13","departure":"17:14"},{"stationId":7,"arrival":"17:18","departure":"17:19"},{"stationId":8,"arrival":"17:23","departure":"17:24"},{"stationId":9,"arrival":"17:29","departure":"17:30"},{"stationId":10,"arrival":"17:34"}]},
        {"trainId":"1836D","type":"普通","direction":"up","destination":"滝部","delayMinutes":0,"timetable":[{"stationId":0,"departure":"16:11"},{"stationId":1,"arrival":"16:16","departure":"16:17"},{"stationId":2,"arrival":"16:21","departure":"16:22"},{"stationId":3,"arrival":"16:23","departure":"16:24"},{"stationId":4,"arrival":"16:26","departure":"16:27"},{"stationId":5,"arrival":"16:30","departure":"16:31"},{"stationId":6,"arrival":"16:34","departure":"16:35"},{"stationId":7,"arrival":"16:40","departure":"16:41"},{"stationId":8,"arrival":"16:45","departure":"16:46"},{"stationId":9,"arrival":"16:49","departure":"16:50"},{"stationId":10,"arrival":"16:53","departure":"16:54"},{"stationId":11,"arrival":"17:02","departure":"17:03"},{"stationId":12,"arrival":"17:06","departure":"17:07"},{"stationId":13,"arrival":"17:14","departure":"17:15"},{"stationId":14,"arrival":"17:22"}]},
        {"trainId":"1838D","type":"普通","direction":"up","destination":"滝部","delayMinutes":0,"timetable":[{"stationId":0,"departure":"17:26"},{"stationId":1,"arrival":"17:30","departure":"17:31"},{"stationId":2,"arrival":"17:36","departure":"17:37"},{"stationId":3,"arrival":"17:39","departure":"17:40"},{"stationId":4,"arrival":"17:42","departure":"17:43"},{"stationId":5,"arrival":"17:48","departure":"17:49"},{"stationId":6,"arrival":"17:53","departure":"17:54"},{"stationId":7,"arrival":"17:56","departure":"17:57"},{"stationId":8,"arrival":"18:03","departure":"18:04"},{"stationId":9,"arrival":"18:08","departure":"18:09"},{"stationId":10,"arrival":"18:13","departure":"18:14"},{"stationId":11,"arrival":"18:21","departure":"18:22"},{"stationId":12,"arrival":"18:26","departure":"18:27"},{"stationId":13,"arrival":"18:34","departure":"18:35"},{"stationId":14,"arrival":"18:42"}]},
        {"trainId":"832D","type":"普通","direction":"up","destination":"小串","delayMinutes":0,"timetable":[{"stationId":0,"departure":"18:04"},{"stationId":1,"arrival":"18:09","departure":"18:10"},{"stationId":2,"arrival":"18:14","departure":"18:15"},{"stationId":3,"arrival":"18:17","departure":"18:18"},{"stationId":4,"arrival":"18:20","departure":"18:21"},{"stationId":5,"arrival":"18:27","departure":"18:28"},{"stationId":6,"arrival":"18:31","departure":"18:32"},{"stationId":7,"arrival":"18:37","departure":"18:38"},{"stationId":8,"arrival":"18:42","departure":"18:43"},{"stationId":9,"arrival":"18:46","departure":"18:47"},{"stationId":10,"arrival":"18:51"}]},
        {"trainId":"1840D","type":"普通","direction":"up","destination":"滝部","delayMinutes":0,"timetable":[{"stationId":0,"departure":"18:39"},{"stationId":1,"arrival":"18:44","departure":"18:45"},{"stationId":2,"arrival":"18:52","departure":"18:53"},{"stationId":3,"arrival":"18:55","departure":"18:56"},{"stationId":4,"arrival":"18:59","departure":"19:00"},{"stationId":5,"arrival":"19:05","departure":"19:06"},{"stationId":6,"arrival":"19:09","departure":"19:10"},{"stationId":7,"arrival":"19:15","departure":"19:16"},{"stationId":8,"arrival":"19:20","departure":"19:21"},{"stationId":9,"arrival":"19:23","departure":"19:24"},{"stationId":10,"arrival":"19:28","departure":"19:29"},{"stationId":11,"arrival":"19:44","departure":"19:45"},{"stationId":12,"arrival":"19:49","departure":"19:50"},{"stationId":13,"arrival":"19:59","departure":"20:00"},{"stationId":14,"arrival":"20:08"}]},
        {"trainId":"836D","type":"普通","direction":"up","destination":"小串","delayMinutes":0,"timetable":[{"stationId":0,"departure":"19:09"},{"stationId":1,"arrival":"19:13","departure":"19:14"},{"stationId":2,"arrival":"19:18","departure":"19:19"},{"stationId":3,"arrival":"19:21","departure":"19:22"},{"stationId":4,"arrival":"19:24","departure":"19:25"},{"stationId":5,"arrival":"19:29","departure":"19:30"},{"stationId":6,"arrival":"19:33","departure":"19:34"},{"stationId":7,"arrival":"19:38","departure":"19:39"},{"stationId":8,"arrival":"19:43","departure":"19:44"},{"stationId":9,"arrival":"19:48","departure":"19:49"},{"stationId":10,"arrival":"19:53"}]},
        {"trainId":"1842D","type":"普通","direction":"up","destination":"小串","delayMinutes":0,"timetable":[{"stationId":0,"departure":"19:46"},{"stationId":1,"arrival":"19:51","departure":"19:52"},{"stationId":2,"arrival":"19:56","departure":"19:57"},{"stationId":3,"arrival":"19:59","departure":"20:00"},{"stationId":4,"arrival":"20:02","departure":"20:03"},{"stationId":5,"arrival":"20:07","departure":"20:08"},{"stationId":6,"arrival":"20:11","departure":"20:12"},{"stationId":7,"arrival":"20:16","departure":"20:17"},{"stationId":8,"arrival":"20:21","departure":"20:22"},{"stationId":9,"arrival":"20:25","departure":"20:26"},{"stationId":10,"arrival":"20:30"}]},
        {"trainId":"1844D","type":"普通","direction":"up","destination":"滝部","delayMinutes":0,"timetable":[{"stationId":0,"departure":"20:20"},{"stationId":1,"arrival":"20:25","departure":"20:26"},{"stationId":2,"arrival":"20:32","departure":"20:33"},{"stationId":3,"arrival":"20:34","departure":"20:35"},{"stationId":4,"arrival":"20:37","departure":"20:38"},{"stationId":5,"arrival":"20:41","departure":"20:42"},{"stationId":6,"arrival":"20:45","departure":"20:46"},{"stationId":7,"arrival":"20:51","departure":"20:52"},{"stationId":8,"arrival":"20:56","departure":"20:57"},{"stationId":9,"arrival":"21:00","departure":"21:01"},{"stationId":10,"arrival":"21:04","departure":"21:05"},{"stationId":11,"arrival":"21:17","departure":"21:18"},{"stationId":12,"arrival":"21:22","departure":"21:23"},{"stationId":13,"arrival":"21:32","departure":"21:33"},{"stationId":14,"arrival":"21:41"}]},
        {"trainId":"838D","type":"普通","direction":"up","destination":"小串","delayMinutes":0,"timetable":[{"stationId":0,"departure":"21:09"},{"stationId":1,"arrival":"21:13","departure":"21:14"},{"stationId":2,"arrival":"21:18","departure":"21:19"},{"stationId":3,"arrival":"21:21","departure":"21:22"},{"stationId":4,"arrival":"21:24","departure":"21:25"},{"stationId":5,"arrival":"21:27","departure":"21:28"},{"stationId":6,"arrival":"21:32","departure":"21:33"},{"stationId":7,"arrival":"21:37","departure":"21:38"},{"stationId":8,"arrival":"21:42","departure":"21:43"},{"stationId":9,"arrival":"21:46","departure":"21:47"},{"stationId":10,"arrival":"21:51"}]},
        {"trainId":"1846D","type":"普通","direction":"up","destination":"小串","delayMinutes":0,"timetable":[{"stationId":0,"departure":"22:00"},{"stationId":1,"arrival":"22:04","departure":"22:05"},{"stationId":2,"arrival":"22:09","departure":"22:10"},{"stationId":3,"arrival":"22:12","departure":"22:13"},{"stationId":4,"arrival":"22:15","departure":"22:16"},{"stationId":5,"arrival":"22:18","departure":"22:19"},{"stationId":6,"arrival":"22:23","departure":"22:24"},{"stationId":7,"arrival":"22:28","departure":"22:29"},{"stationId":8,"arrival":"22:33","departure":"22:34"},{"stationId":9,"arrival":"22:38","departure":"22:39"},{"stationId":10,"arrival":"22:43"}]},
        {"trainId":"1848R","type":"代行輸送","direction":"up","destination":"滝部","delayMinutes":0,"timetable":[{"stationId":10,"departure":"09:51"},{"stationId":11,"arrival":"10:00","departure":"10:01"},{"stationId":12,"arrival":"10:04","departure":"10:05"},{"stationId":13,"arrival":"10:09","departure":"10:10"},{"stationId":14,"arrival":"10:16"}]},
        {"trainId":"840R","type":"代行輸送","direction":"up","destination":"滝部","delayMinutes":0,"timetable":[{"stationId":10,"departure":"11:24"},{"stationId":11,"arrival":"11:33","departure":"11:34"},{"stationId":12,"arrival":"11:37","departure":"11:38"},{"stationId":13,"arrival":"11:42","departure":"11:43"},{"stationId":14,"arrival":"11:49"}]},
        {"trainId":"840R","type":"代行輸送","direction":"up","destination":"滝部","delayMinutes":0,"timetable":[{"stationId":10,"departure":"13:00"},{"stationId":11,"arrival":"13:09","departure":"13:10"},{"stationId":12,"arrival":"13:13","departure":"13:14"},{"stationId":13,"arrival":"13:18","departure":"13:19"},{"stationId":14,"arrival":"13:25"}]},
    
        // テスト用：午前0時台の列車 (下関方面)
        {"trainId":"T001D","type":"普通","direction":"down","destination":"下関","delayMinutes":0,"timetable":[
            {"stationId":14,"departure":"00:05"}, // 滝部発
            {"stationId":13,"arrival":"00:12","departure":"00:13"}, // 長門二見
            {"stationId":12,"arrival":"00:17","departure":"00:18"}, // 宇賀本郷
            {"stationId":11,"arrival":"00:21","departure":"00:22"}, // 湯玉
            {"stationId":10,"arrival":"00:28","departure":"00:29"}, // 小串
            {"stationId":9,"arrival":"00:33","departure":"00:34"}, // 川棚温泉
            {"stationId":8,"arrival":"00:37","departure":"00:38"}, // 黒井村
            {"stationId":7,"arrival":"00:42","departure":"00:43"}, // 梅ヶ峠
            {"stationId":6,"arrival":"00:47","departure":"00:48"}, // 吉見
            {"stationId":5,"arrival":"00:51","departure":"00:52"}, // 福江
            {"stationId":4,"arrival":"00:55","departure":"00:56"}, // 安岡
            {"stationId":3,"arrival":"00:58","departure":"00:59"}, // 梶栗郷台地
            {"stationId":2,"arrival":"01:01","departure":"01:02"}, // 綾羅木
            {"stationId":1,"arrival":"01:06","departure":"01:07"}, // 幡生
            {"stationId":0,"arrival":"01:12"}  // 下関着
            ]},
    ];

    // 各列車にランダムな混雑度を割り当てる (デモンストレーション用)
    trainSchedules.forEach(train => {
        train.comfortIndex = Math.floor(Math.random() * comfortLevels.length); // 0から4までの整数
    });

    // Global variable to keep track of the currently active tooltip's trigger element
    let activeTooltipElement = null;

    // --- ヘルパー関数 ---
    function parseTime(timeStr) {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    function isSectionActiveNow(section, now) {
        if (!section.startTime || !section.endTime) return true;
        const sectionStartTime = parseTime(section.startTime);
        const sectionEndTime = parseTime(section.endTime);
        return now >= sectionStartTime && now < sectionEndTime;
    }

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
                    altText = '運休情報';
                } else {
                    iconSrc = imagePaths.info;
                    altText = 'お知らせ';
                }
                item.innerHTML = `<div class="announcement-icon"><img src="${iconSrc}" alt="${altText}"></div><span>${info.message}</span>`;
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
                const tooltipContent = `
                    <h3>駅情報</h3>
                    <div class="sub-text">駅名と乗入れ路線</div>
                    <p><b>駅名:</b> ${station.name}</p>
                    <p><b>乗入れ路線:</b> ${station.stationCode || '山陰本線'}</p>
                    <div class="disclaimer">● 実際の情報と異なる場合があります</div>
                `;

                iconWrapperDiv.addEventListener('click', (e) => {
                    e.stopPropagation(); // イベントの伝播を停止して、ドキュメント全体のクリックイベントによるツールチップ非表示を防ぐ
                    showTooltip(e.target, tooltipContent);
                });
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
        suspensionListDiv.innerHTML = ''; // 既存のセクションをクリア

        // 運休区間をレンダリング
        suspendedSections.forEach(section => {
            if (!isSectionActiveNow(section, now)) return;
            const fromStationElem = document.getElementById(`station-${section.fromStationId}`);
            const toStationElem = document.getElementById(`station-${section.toStationId}`);
            if (!fromStationElem || !toStationElem) return;
            const topY = fromStationElem.offsetTop + fromStationElem.offsetHeight / 2;
            const bottomY = toStationElem.offsetTop + toStationElem.offsetHeight / 2;
            const suspensionDiv = document.createElement('div');
            suspensionDiv.className = 'suspended-section';
            suspensionDiv.style.top = `${topY}px`;
            suspensionDiv.style.height = `${bottomY - topY}px`;
            const tooltipContent = `
                <h3>運休区間</h3>
                <div class="sub-text">運行見合わせ情報</div>
                <p><b>区間:</b> ${stations.find(s=>s.id === section.fromStationId).name}～${stations.find(s=>s.id === section.toStationId).name}</p>
                <p><b>理由:</b> ${section.reason}</p>
                <div class="disclaimer">● 実際の情報と異なる場合があります</div>
            `;
            suspensionDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                showTooltip(e.target, tooltipContent);
            });
            suspensionListDiv.appendChild(suspensionDiv);
        });

        // お知らせ範囲をレンダリング
        infoRangeSections.forEach(section => {
            if (!isSectionActiveNow(section, now)) return;
            const fromStationElem = document.getElementById(`station-${section.fromStationId}`);
            const toStationElem = document.getElementById(`station-${section.toStationId}`);
            if (!fromStationElem || !toStationElem) return;
            const topY = fromStationElem.offsetTop + fromStationElem.offsetHeight / 2;
            const bottomY = toStationElem.offsetTop + toStationElem.offsetHeight / 2;
            const infoRangeDiv = document.createElement('div');
            infoRangeDiv.className = 'info-range-section';
            infoRangeDiv.style.top = `${topY}px`;
            infoRangeDiv.style.height = `${bottomY - topY}px`;
            const tooltipContent = `
                <h3>お知らせ区間</h3>
                <div class="sub-text">運行に関する注意情報</div>
                <p><b>区間:</b> ${stations.find(s=>s.id === section.fromStationId).name}～${stations.find(s=>s.id === section.toStationId).name}</p>
                <p><b>内容:</b> ${section.reason}</p>
                <div class="disclaimer">● 実際の情報と異なる場合があります</div>
            `;
            infoRangeDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                showTooltip(e.target, tooltipContent);
            });
            suspensionListDiv.appendChild(infoRangeDiv);
        });
    }

    // --- ツールチップ関連 ---
    function showTooltip(targetElement, contentHtml) {
        // 同じ要素がクリックされた場合、ツールチップを非表示にする (トグル動作)
        if (activeTooltipElement === targetElement && tooltip.classList.contains('active')) {
            hideTooltip();
            return;
        }

        // 以前に表示されていたツールチップがあれば非表示にする
        if (activeTooltipElement && activeTooltipElement !== targetElement) {
            hideTooltip();
        }

        tooltip.innerHTML = contentHtml;
        tooltip.style.display = 'block'; // サイズ測定のためにブロック要素にする
        tooltip.classList.add('active'); // アニメーションクラスを追加

        const targetRect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top = targetRect.top - tooltipRect.height - 15; // ターゲットの上15px
        let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);

        // ツールチップが画面上部からはみ出す場合
        if (top < 10) {
            top = targetRect.bottom + 15; // ターゲットの下15px
        }
        // ツールチップが画面左右からはみ出す場合
        if (left < 10) {
            left = 10;
        } else if (left + tooltipRect.width > viewportWidth - 10) {
            left = viewportWidth - tooltipRect.width - 10;
        }
        // ツールチップが画面下部からはみ出す場合 (モバイル対応で下部に固定するため、デスクトップでは上部優先)
        if (top + tooltipRect.height > viewportHeight - 10 && top > targetRect.top) {
            top = targetRect.top - tooltipRect.height - 15; // 再度上を試す
            if (top < 10) top = 10; // それでもはみ出すなら上端に固定
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        
        activeTooltipElement = targetElement; // 現在のトリガー要素を記録
    }

    function hideTooltip() {
        tooltip.classList.remove('active'); // アニメーションクラスを削除
        // transitionが完了してからdisplayをnoneにする
        tooltip.addEventListener('transitionend', function handler() {
            if (!tooltip.classList.contains('active')) { // activeクラスがなければdisplay:noneにする
                tooltip.style.display = 'none';
                tooltip.removeEventListener('transitionend', handler);
            }
        });
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
        trainListDiv.innerHTML = ''; // 列車リストをクリア
        renderSuspendedSections(now); // 運休・お知らせ範囲を再描画

        // NEW: 全体速度調整ファクターを計算
        const effectiveSpeedFactor = globalSlowOperationPercentage / 100;

        trainSchedules.forEach(train => {
            // trainTimeは遅延を考慮した時刻。列車の位置計算に使用。
            const trainTime = new Date(now.getTime() - train.delayMinutes * 60 * 1000);
            
            let trainRendered = false; // 現在の列車が描画されたかどうかのフラグ

            // 1. 運行支障の確認 (最優先)
            const issue = operationalIssues.find(p => p.trainId === train.trainId);
            if (issue) {
                const stationElem = document.getElementById(`station-${issue.stationId}`);
                if (!stationElem) {
                    console.warn(`駅要素が見つかりません: station-${issue.stationId}`);
                    return;
                }
                const trainY = stationElem.offsetTop + stationElem.offsetHeight / 2;
                const trainDiv = document.createElement('div');
                trainDiv.className = 'train stopped-image';
                trainDiv.innerHTML = `<img src="${imagePaths.stopped}" alt="運行支障">`;
                trainDiv.style.top = `${trainY - 22.5}px`; // 列車アイコンの高さの半分を引く

                // 運行支障時のツールチップ内容を生成
                const tooltipContentHtml = `
                    <h3>運行状況</h3>
                    <div class="sub-text">運行支障発生中</div>
                    <div class="train-info-section">
                        <span class="train-type-label">${train.type}</span>
                        <div class="train-main-info">${stations.find(s=>s.id === issue.stationId).name}駅 <span>停車中</span></div>
                    </div>
                    <div class="delay-status" style="color: var(--stop-color);">運行支障: ${issue.reason}</div>
                    ${train.comfortIndex !== undefined ? `<div class="comfort-index-section"><b>混雑度:</b> <span class="${comfortClassMap[train.comfortIndex]}">${comfortLevels[train.comfortIndex]}</span></div>` : ''}
                    <div class="disclaimer">● 実際の列車情報と異なる場合があります</div>
                `;
                
                trainDiv.addEventListener('click', (e) => { e.stopPropagation(); showTooltip(e.target, tooltipContentHtml); });
                trainListDiv.appendChild(trainDiv);
                trainRendered = true;
                return; // 支障がある場合はここで終了
            }

            // 2. 時刻表を走査して列車の状態と位置を決定
            for (let i = 0; i < train.timetable.length; i++) {
                const currentStop = train.timetable[i];
                const nextStop = train.timetable[i + 1];

                const arrivalTime = parseTime(currentStop.arrival);
                const departureTime = parseTime(currentStop.departure);

                // A. 終着駅に到着済み (代行輸送を除く)
                if (i === train.timetable.length - 1 && arrivalTime && train.type !== '代行輸送') {
                    const oneMinuteAfterArrival = new Date(arrivalTime.getTime() + 1 * 60 * 1000);
                    if (now >= arrivalTime && now <= oneMinuteAfterArrival) {
                        const stationElem = document.getElementById(`station-${currentStop.stationId}`);
                        if (!stationElem) continue;
                        const trainY = stationElem.offsetTop + stationElem.offsetHeight / 2;
                        const trainDiv = document.createElement('div');
                        trainDiv.className = 'train waiting-image';
                        trainDiv.innerHTML = `<img src="${imagePaths.waiting}" alt="乗降中">`;
                        trainDiv.style.top = `${trainY - 22.5}px`;

                        const tooltipContentHtml = `
                            <h3>運行状況</h3>
                            <div class="sub-text">終着駅到着</div>
                            <div class="train-info-section">
                                <span class="train-type-label">${train.type}</span>
                                <div class="train-main-info">${train.trainId} ${stations.find(s=>s.id === currentStop.stationId).name}駅 <span>到着済</span></div>
                            </div>
                            ${train.comfortIndex !== undefined ? `<div class="comfort-index-section"><b>混雑度:</b> <span class="${comfortClassMap[train.comfortIndex]}">${comfortLevels[train.comfortIndex]}</span></div>` : ''}
                            <div class="disclaimer">● 実際の列車情報と異なる場合があります</div>
                        `;
                        
                        trainDiv.addEventListener('click', (e) => { e.stopPropagation(); showTooltip(e.target, tooltipContentHtml); });
                        trainListDiv.appendChild(trainDiv);
                        trainRendered = true;
                        break;
                    }
                }

                // B. 始発駅で発車待機中 (代行輸送を除く)
                if (i === 0 && departureTime && train.type !== '代行輸送') {
                    const threeMinutesBeforeDeparture = new Date(departureTime.getTime() - 3 * 60 * 1000);
                    if (now >= threeMinutesBeforeDeparture && now <= departureTime) {
                        const stationElem = document.getElementById(`station-${currentStop.stationId}`);
                        if (!stationElem) continue;
                        const trainY = stationElem.offsetTop + stationElem.offsetHeight / 2;
                        const trainDiv = document.createElement('div');
                        trainDiv.className = 'train waiting-image';
                        trainDiv.innerHTML = `<img src="${imagePaths.waiting}" alt="乗降中">`;
                        trainDiv.style.top = `${trainY - 22.5}px`;

                        const tooltipContentHtml = `
                            <h3>運行状況</h3>
                            <div class="sub-text">始発駅発車待機中</div>
                            <div class="train-info-section">
                                <span class="train-type-label">${train.type}</span>
                                <div class="train-main-info">${train.trainId} ${stations.find(s=>s.id === currentStop.stationId).name}駅 <span>発車待機中</span></div>
                            </div>
                            ${train.comfortIndex !== undefined ? `<div class="comfort-index-section"><b>混雑度:</b> <span class="${comfortClassMap[train.comfortIndex]}">${comfortLevels[train.comfortIndex]}</span></div>` : ''}
                            <div class="disclaimer">● 実際の列車情報と異なる場合があります</div>
                        `;
                        
                        trainDiv.addEventListener('click', (e) => { e.stopPropagation(); showTooltip(e.target, tooltipContentHtml); });
                        trainListDiv.appendChild(trainDiv);
                        trainRendered = true;
                        break;
                    }
                }

                // C. 駅で停車中 (通常の停車、上記A, B以外)
                if (arrivalTime && departureTime && trainTime >= arrivalTime && trainTime < departureTime) {
                    const stationElem = document.getElementById(`station-${currentStop.stationId}`);
                    if (!stationElem) continue;
                    const trainY = stationElem.offsetTop + stationElem.offsetHeight / 2;
                    const trainDiv = document.createElement('div');
                    trainDiv.className = 'train waiting-image';
                    trainDiv.innerHTML = `<img src="${imagePaths.waiting}" alt="乗降中">`;
                    trainDiv.style.top = `${trainY - 22.5}px`;

                    const tooltipContentHtml = `
                        <h3>運行状況</h3>
                        <div class="sub-text">駅停車中</div>
                        <div class="train-info-section">
                            <span class="train-type-label">${train.type}</span>
                            <div class="train-main-info">${train.trainId} ${stations.find(s=>s.id === currentStop.stationId).name}駅 <span>停車中</span></div>
                        </div>
                        ${train.comfortIndex !== undefined ? `<div class="comfort-index-section"><b>混雑度:</b> <span class="${comfortClassMap[train.comfortIndex]}">${comfortLevels[train.comfortIndex]}</span></div>` : ''}
                        <div class="disclaimer">● 実際の列車情報と異なる場合があります</div>
                    `;
                    
                    trainDiv.addEventListener('click', (e) => { e.stopPropagation(); showTooltip(e.target, tooltipContentHtml); });
                    trainListDiv.appendChild(trainDiv);
                    trainRendered = true;
                    break;
                }

                // D. 駅間を走行中
                if (departureTime && nextStop) {
                    const nextArrivalTime = parseTime(nextStop.arrival);
                    if (nextArrivalTime && trainTime >= departureTime && trainTime < nextArrivalTime) {
                        const isSuspended = suspendedSections.some(section => isSectionActiveNow(section, now) && [section.fromStationId, section.toStationId].sort((a,b)=>a-b).join() === [currentStop.stationId, nextStop.stationId].sort((a,b)=>a-b).join());
                        if (isSuspended) {
                            // 運休区間を走行中のため列車は表示しない
                            trainRendered = true;
                            break;
                        }

                        const timeElapsed = trainTime - departureTime;
                        const totalScheduledTravelTime = nextArrivalTime - departureTime;

                        // NEW: 全体速度調整ファクターを適用
                        const adjustedTravelTime = totalScheduledTravelTime / effectiveSpeedFactor;

                        const progress = timeElapsed / adjustedTravelTime;

                        const prevStationElem = document.getElementById(`station-${currentStop.stationId}`);
                        const nextStationElem = document.getElementById(`station-${nextStop.stationId}`);
                        if (!prevStationElem || !nextStationElem) continue;

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
                            delayStatusColor = 'var(--substitute-color)'; // 代行輸送は紫系
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
                                delayStatusColor = train.direction === 'up' ? 'var(--up-train-color)' : 'var(--down-train-color)'; // 定刻は上り/下りの色に合わせる
                                className += train.direction === 'up' ? ' up-image' : ' down-image';
                                imgSrc = train.direction === 'up' ? imagePaths.up : imagePaths.down;
                                altText = train.direction === 'up' ? '上り' : '下り';
                                // 定刻の場合はオーバーレイテキストなし
                            }
                        }
                        
                        trainDiv.className = className;
                        // innerHTMLにオーバーレイ要素を追加
                        trainDiv.innerHTML = `
                            <img src="${imgSrc}" alt="${altText}">
                            ${overlayText ? `<div class="train-status-overlay ${overlayClass}">${overlayText}</div>` : ''}
                        `;
                        trainDiv.style.top = `${trainY - 22.5}px`; // 列車アイコンの高さの半分を引く
                        
                        // 駅間走行中のツールチップ内容を生成
                        const tooltipContentHtml = `
                            <h3>運行状況</h3>
                            <div class="sub-text">${stations.find(s=>s.id === currentStop.stationId).name} から ${stations.find(s=>s.id === nextStop.stationId).name} へ走行中</div>
                            <div class="train-info-section">
                                <span class="train-type-label">${train.type}</span>
                                <div class="train-main-info">${train.trainId} ${train.destination}<span>行き</span></div>
                            </div>
                            <div class="delay-status" style="color: ${delayStatusColor};">${delayStatusText}</div>
                            ${train.comfortIndex !== undefined ? `<div class="comfort-index-section"><b>混雑度:</b> <span class="${comfortClassMap[train.comfortIndex]}">${comfortLevels[train.comfortIndex]}</span></div>` : ''}
                            ${nextStop.arrival ? `<div class="next-station-arrival">次駅 <span>${stations.find(s=>s.id === nextStop.stationId).name}駅</span> 到着予定: <span>${nextStop.arrival}</span></div>` : ''}
                            <div class="disclaimer">● 実際の列車情報と異なる場合があります</div>
                        `;
                        
                        trainDiv.addEventListener('click', (e) => { e.stopPropagation(); showTooltip(e.target, tooltipContentHtml); });
                        trainListDiv.appendChild(trainDiv);
                        trainRendered = true;
                        break;
                    }
                }
            }
        });
    }
    
    // --- 初期化と実行 ---
    renderAnnouncements();
    renderStations();
    updatePositions();
    setInterval(updatePositions, 5000); // 5秒ごとに更新
});
