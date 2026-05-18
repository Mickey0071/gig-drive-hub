export type ChecklistValue = "pass" | "fail" | "na";

export type ChecklistSection = {
  key: string;
  title: string;
  items: { key: string; label: string }[];
};

export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    key: "before_starting",
    title: "Before Starting Car",
    items: [
      { key: "oil_level", label: "Check oil level before starting engine" },
      { key: "spare_key", label: "Spare key present and accounted for" },
      { key: "inspection_sticker", label: "Inspection sticker — valid and not expired" },
    ],
  },
  {
    key: "exterior",
    title: "Exterior",
    items: [
      { key: "four_corners", label: "Inspected all four corners" },
      { key: "tires", label: "All 4 tires — no flats, bulges, or extreme wear" },
      { key: "lights", label: "All lights working — headlights, taillights, signals" },
      { key: "windshield", label: "Windshield — no new cracks" },
      { key: "wipers", label: "Windshield wipers functional" },
      { key: "windows", label: "All windows intact and functional" },
      { key: "seatbelts", label: "All seatbelts latch and retract properly" },
    ],
  },
  {
    key: "interior",
    title: "Interior",
    items: [
      { key: "no_trash", label: "No trash or personal items from renter" },
      { key: "no_odors", label: "No odors — smoke, food, or other" },
      { key: "floor_mats", label: "Floor mats present and not near pedals" },
      { key: "glovebox_docs", label: "Insurance card and registration in glovebox" },
      { key: "spare_tire_kit", label: "Spare tire, jack, and lug wrench in trunk" },
      { key: "ac", label: "Air conditioner working properly" },
      { key: "radio", label: "Radio / infotainment functional" },
    ],
  },
  {
    key: "test_drive",
    title: "Test Drive",
    items: [
      { key: "test_drive_completed", label: "Test drive completed" },
      { key: "brakes", label: "Brakes firm — no grinding, no pulling" },
      { key: "dash_warnings", label: "No warning lights on dashboard" },
      { key: "steering", label: "Steering tracks straight, no clunking" },
      { key: "transmission", label: "Transmission shifts smoothly" },
      { key: "no_clunking", label: "No loud clunking over bumps" },
    ],
  },
];

export const JOB_TYPES = [
  { value: "vehicle_return", emoji: "🔑", label: "Vehicle Return" },
  { value: "repossession", emoji: "🚨", label: "Repossession" },
  { value: "new_acquisition", emoji: "🏷️", label: "New Acquisition" },
  { value: "mechanic_run", emoji: "🔧", label: "Mechanic Run" },
  { value: "dmv_reg", emoji: "📋", label: "DMV / Reg" },
  { value: "inspection", emoji: "✅", label: "Inspection" },
] as const;

export const FUEL_LEVELS = [
  { value: "full", label: "Full" },
  { value: "three_quarter", label: "3/4" },
  { value: "half", label: "1/2" },
  { value: "quarter", label: "1/4" },
  { value: "empty", label: "Empty / Very Low" },
] as const;