import eventImageOne from "../../events1.webp";
import eventImageTwo from "../../events2.webp";
import eventImageThree from "../../events3.webp";

export default function ExhibitionsPage() {
  const pastEvents = [
    {
      title: "Qatar International Art Festival",
      place: "",
      date: "7 - 12 Dec 2025",
      image: eventImageOne.src,
      variant: "landscape",
    },
    {
      title: "Pink Polo",
      place: "Ghantoot Racing & Polo Club",
      date: "8 Nov 2025",
      image: eventImageTwo.src,
      variant: "portrait",
    },
    {
      title: "ADIHEX 2025",
      place: "Concourse Hall, C5-12",
      date: "30 Aug - 7 Sep 2025",
      image: eventImageThree.src,
      variant: "landscape",
    },
  ];

  return (
    <section className="section page-section events-page">
      <h1 className="events-page-title">PAST</h1>
      <div className="events-grid">
        {pastEvents.map((item) => (
          <article key={item.title} className={`events-card ${item.variant}`}>
            <img src={item.image} alt={item.title} />
            <h2>{item.title}</h2>
            {item.place ? <p className="events-place">{item.place}</p> : null}
            <p className="events-date">{item.date}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
