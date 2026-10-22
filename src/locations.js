const PLACES = {
  hall: { room: "1", name: "災害虛擬實境訓練場", area: "hall" },
  command: { room: "2", name: "救災指揮站模擬暨多功能教室", area: "command" },
  forward: { room: "3", name: "前進指揮所模擬暨多功能教室", area: "forward" },
  office: { room: "", name: "辦公室", area: "office" },
  remote: { room: "6", name: "遠距演習平台", area: "remote" },
  entrance: { room: "", name: "入口走廊", area: "entrance" },
  outside: { room: "", name: "入口外側", area: "outside" },
};

const TASK_PLACE = {
  場控: "command",
  長官接送: "outside",
  金級開場前咖啡茶點準備: "entrance",
  紀念品位上準備: "hall",
  簽到處: "entrance",
  報到及轉場休息貴賓接待: "command",
  主持: "hall",
  拍照攝影: "hall",
  "洗照片(如果要)": "office",
  電視牆: "hall",
  視訊測試: "remote",
  主訓練場聲光影像控制: "hall",
  午餐發放: "entrance",
  下午茶準備: "entrance",
  中巴管控: "outside",
  預備人員: "forward",
};

export function placeFor(task) {
  if (String(task).startsWith("晚宴")) return { pending: true, name: "晚宴場地稍後補", area: "" };
  const area = TASK_PLACE[task];
  if (!area) return null;
  return { pending: false, ...PLACES[area] };
}

export function placeLabel(place) {
  if (!place) return "";
  if (place.pending) return place.name;
  return place.room ? `${place.room} ${place.name}` : place.name;
}
