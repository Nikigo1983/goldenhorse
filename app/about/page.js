import Link from "next/link";
import { categories } from "../../data/siteData";

export default function AboutPage() {
  return (
    <div className="about-page-surface">
      <section className="section page-section about-page">
        <h1 className="big-title">THE GOLDEN HORSE</h1>
        <h2 className="subtitle-title">DUBAI ART GALLERY</h2>
        <div className="divider" />

        <p>
          With true love to horses and huge gratitude to their dedication to people through
          ages, inspired by their grace and power, we created this space, where:
        </p>
        <p>- your legacy is born</p>
        <p>- emotions meet form</p>
        <p>- living with art becomes a lifestyle</p>

        <h3 className="group-title about-free-ai-title">FREE OF AI ART</h3>
        <div className="divider" />
        <p>This is what we stand for.</p>
        <p>Each artwork is created by soul and hands of artists, without AI applied.</p>

        <div className="categories-list categories-stack">
          {categories.map((cat) => (
            <Link
              key={cat}
              href={
                cat === "Painting"
                  ? "/artworks/painting"
                  : cat === "Photography"
                    ? "/artworks/photography"
                    : cat === "Sculpture"
                      ? "/artworks/sculpture"
                      : cat === "Porcelain"
                        ? "/artworks/porcelain"
                        : cat === "Jewelry Art"
                          ? "/artworks/jewelry"
                          : cat === "Publishing"
                            ? "/artworks/publishing"
                            : "/artworks"
              }
            >
              <span className="about-category-label">{cat}</span>
            </Link>
          ))}
        </div>

        <h3 className="group-title about-free-ai-title">
          INFORMATION BELOW CONCERNS HORSE OWNERS AND HORSE BREEDERS
        </h3>
        <div className="divider about-small-divider" />
        <p>Photo shooting of horses by renowned photographer ARTUR BABOEV @artur_baboev</p>
        <p>What gives you professional photo shooting:</p>
        <p>- professional portfolio of a horse (for contests and show)</p>
        <p>- perfect personal content</p>
        <p>- art photography</p>
        <p>- personal photo session with champions of the breeds</p>
        <p>To book a photo shooting contact The Golden Horse Gallery</p>
        <p>+ 971 55 230 8228 @the_golden_horse_dubai</p>
        <p>or directly the photographer</p>
        <p>+7 925 117 76 01 @artur_baboev</p>
      </section>
    </div>
  );
}
