export type Availability = {
  instructor: string;
  availableTimes: string[];
};

export const availability: Availability[] = [
  {
    instructor: "Alex Doolittle",
    availableTimes: ["3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM"],
  },
  {
    instructor: "Jordan Smith",
    availableTimes: ["4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM"],
  },
];

export function getAvailabilityForInstructor(name: string) {
  return availability.find(a => a.instructor === name)?.availableTimes ?? [];
}
