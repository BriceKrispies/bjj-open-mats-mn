export interface MatEvent {
  id: string;
  gym: string;
  city: string;
  date: string;
  time: string;
  endTime: string;
  rsvpCount: number;
  capacity?: number;
  remaining?: number;
  lat?: number;
  lon?: number;
  isNew?: boolean;
  createdAt?: string;
  description?: string;
  gi?: boolean;
  nogi?: boolean;
}

function today() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function getMockEvents(): MatEvent[] {
  const t = today();
  const tm = tomorrow();
  return [
    { id: "1", gym: "The Cellar Gym", city: "Minneapolis", date: t, time: "11:00 AM", endTime: "1:00 PM", rsvpCount: 22, capacity: 25, remaining: 3, lat: 44.9778, lon: -93.265, description: "Open mat for all levels. Gi and No-Gi welcome.", gi: true, nogi: true },
    { id: "2", gym: "Midwest Martial Arts", city: "Bloomington", date: t, time: "12:00 PM", endTime: "2:00 PM", rsvpCount: 14, capacity: 30, remaining: 16, lat: 44.8408, lon: -93.2983, description: "Saturday open mat. Beginners encouraged!", gi: true, nogi: false },
    { id: "3", gym: "Alliance MN", city: "St. Paul", date: t, time: "10:00 AM", endTime: "12:00 PM", rsvpCount: 18, capacity: 20, remaining: 2, lat: 44.9537, lon: -93.09, isNew: true, createdAt: new Date().toISOString(), description: "Competition-focused rolling. All belts.", gi: false, nogi: true },
    { id: "4", gym: "Gracie Barra Edina", city: "Edina", date: t, time: "2:00 PM", endTime: "4:00 PM", rsvpCount: 8, lat: 44.8897, lon: -93.3499, description: "Casual open mat. No-Gi only.", gi: false, nogi: true },
    { id: "5", gym: "Minnesota Top Team", city: "Eagan", date: t, time: "3:00 PM", endTime: "5:00 PM", rsvpCount: 11, capacity: 15, remaining: 4, lat: 44.8041, lon: -93.1669, description: "MMA and grappling open mat.", gi: true, nogi: true },
    { id: "6", gym: "Warrior's Cove", city: "Minneapolis", date: tm, time: "10:00 AM", endTime: "12:00 PM", rsvpCount: 19, capacity: 22, remaining: 3, lat: 44.9631, lon: -93.2683, description: "Sunday morning open mat.", gi: true, nogi: true },
    { id: "7", gym: "Academy MN", city: "Plymouth", date: tm, time: "11:00 AM", endTime: "1:00 PM", rsvpCount: 6, capacity: 20, remaining: 14, lat: 45.0105, lon: -93.4555, isNew: true, createdAt: new Date().toISOString(), description: "Friendly rolls, all levels.", gi: true, nogi: false },
    { id: "8", gym: "Tapped Out MMA", city: "St. Paul", date: tm, time: "1:00 PM", endTime: "3:00 PM", rsvpCount: 12, lat: 44.9445, lon: -93.0962, description: "No-Gi only open mat.", gi: false, nogi: true },
    { id: "9", gym: "GB Maple Grove", city: "Maple Grove", date: tm, time: "9:00 AM", endTime: "11:00 AM", rsvpCount: 15, capacity: 18, remaining: 3, lat: 45.0725, lon: -93.4558, description: "Morning open mat. Gi required.", gi: true, nogi: false },
    { id: "10", gym: "10th Planet Minneapolis", city: "Minneapolis", date: tm, time: "4:00 PM", endTime: "6:00 PM", rsvpCount: 9, capacity: 25, remaining: 16, lat: 44.9489, lon: -93.2363, isNew: true, createdAt: new Date().toISOString(), description: "No-Gi only. Rubber guard welcome.", gi: false, nogi: true },
  ];
}

export function isAlmostFull(e: MatEvent): boolean {
  if (!e.capacity) return false;
  return (e.remaining !== undefined && e.remaining <= 3) || (e.rsvpCount / e.capacity >= 0.85);
}
