import { Metadata } from "next";
import SchoolCalendarView from "./_components/SchoolCalendarView";

export const metadata: Metadata = {
  title: "ปฏิทินกิจกรรมสถานศึกษา | KP e-Leave",
  description: "ปฏิทินกิจกรรม ปฏิทินวิชาการ และกำหนดการสำคัญของสถานศึกษา โรงเรียนกุดจับประชาสรรค์",
};

export default function CalendarPage() {
  return <SchoolCalendarView />;
}
