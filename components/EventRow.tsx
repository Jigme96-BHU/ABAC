import Link from "next/link";
import { chip, type ABACEvent } from "@/content/events";
import RsvpForm from "@/components/RsvpForm";

export default function EventRow({
  event,
  detail = false,
}: {
  event: ABACEvent;
  detail?: boolean;
}) {
  const { m, d } = chip(event.date);
  const meta = [event.location, detail ? event.time : undefined, detail ? event.note : undefined]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="event-row">
      <div className="event-date">
        <div className="m">{m}</div>
        <div className="d">{d}</div>
      </div>
      <div className="event-info">
        <h3>{event.title}</h3>
        <p>{meta}</p>
      </div>
      {event.access === "members" ? (
        <span className="badge members">Members only</span>
      ) : detail && event.cta === "rsvp" ? (
        <RsvpForm event={event} />
      ) : detail && event.cta === "volunteer" ? (
        <Link href="/volunteers" className="btn btn-primary btn-sm">
          Volunteer
        </Link>
      ) : (
        <span className="badge open">RSVP open</span>
      )}
    </div>
  );
}
