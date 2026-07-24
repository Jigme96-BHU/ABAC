import { chip, type ABACEvent } from "@/content/events";

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
      ) : detail && event.cta ? (
        <button className="btn btn-primary btn-sm" disabled title="Available once memberships go live">
          {event.cta === "volunteer" ? "Volunteer" : "RSVP"}
        </button>
      ) : (
        <span className="badge open">RSVP open</span>
      )}
    </div>
  );
}
