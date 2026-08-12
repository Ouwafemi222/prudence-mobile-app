import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addDaysISODate,
  formatLongDateInNigeria,
  getSundayWeekNumber,
  listRecentWeekStarts,
} from "@/lib/nigeriaTime";

type WeekPickerProps = {
  value: string;
  onChange: (weekStartISO: string) => void;
  count?: number;
  className?: string;
};

export function WeekPicker({ value, onChange, count = 16, className }: WeekPickerProps) {
  const weeks = listRecentWeekStarts(count);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-full sm:w-56"}>
        <SelectValue placeholder="Select week" />
      </SelectTrigger>
      <SelectContent>
        {weeks.map((start) => {
          const end = addDaysISODate(start, 6);
          const num = getSundayWeekNumber(start);
          return (
            <SelectItem key={start} value={start}>
              Week {num} — Sun {formatLongDateInNigeria(new Date(`${start}T12:00:00`))} to Sat{" "}
              {formatLongDateInNigeria(new Date(`${end}T12:00:00`))}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
