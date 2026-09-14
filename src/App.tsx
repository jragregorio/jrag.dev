import { SiteHeader } from "@/components/SiteHeader";
import { DottedGrid } from "@/components/ui/dotted-grid";
import { PageReveal } from "@/components/PageReveal";
import { ContactList } from "@/components/ContactList";
import { Gallery4, type Gallery4Item } from "@/components/ui/gallery4";

const asset = (file: string) =>
  `${import.meta.env.BASE_URL}${file.replace(/^\//, "")}`;

const workItems: Gallery4Item[] = [
  {
    id: "warden",
    title: "Warden",
    description:
      "Parental screen time for Windows, with a web dashboard and an Android app. Parents set a daily limit; the child's PC enforces it.",
    href: "https://warden-alpha.vercel.app/",
    image: asset("projects/warden.png"),
    imageClassName: "object-[72%_center]",
  },
  {
    id: "pixel-maze",
    title: "Pixel Maze",
    description:
      "Player site for an online casino, with an admin dashboard and CRM for operators.",
    href: "https://www.pixel-maze.com/",
    image: asset("projects/pixel-maze.png"),
    imageClassName: "object-[center_30%]",
  },
  {
    id: "sitcheck",
    title: "SitCheck",
    description:
      "A map of nearby toilets with bidet, cleanliness, and whether you have to pay. Android app with community listings.",
    href: "https://jragregorio.github.io/sitcheck/",
    image: asset("projects/sitcheck.png"),
    imageClassName: "object-top",
  },
  {
    id: "ssm",
    title: "South Seafood Market",
    description:
      "A storefront for a neighborhood seafood shop in Alabang Hills. Browse the day's catch, add to cart, and send an order.",
    href: "https://jragregorio.github.io/ssm/",
    image: asset("projects/ssm.png"),
    imageClassName: "object-top",
  },
  {
    id: "lsqb",
    title: "LuxeShade Quote Builder",
    description:
      "A private quote tool for LuxeShade. Materials, measurements, and pricing for curtain jobs.",
    href: "",
    image: asset("projects/lsqb.png"),
    imageClassName: "object-[center_18%]",
    isPrivate: true,
  },
];

function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteHeader />

      <div className="page-curtain">
        <DottedGrid />
        <main id="main">
          <section className="intro" aria-labelledby="intro-heading">
            <div className="intro__inner">
              <h1 id="intro-heading" className="intro__name sr-only">
                JRAG
              </h1>
              <p className="intro__tagline">
                I build software for people who use it every day.
              </p>
            </div>
          </section>
        </main>
      </div>

      <PageReveal>
        <div className="page-reveal__work">
          <Gallery4 items={workItems} />
        </div>
        <section
          id="contact"
          className="contact"
          aria-labelledby="contact-heading"
        >
          <h2 id="contact-heading" className="contact__heading">
            Contact
          </h2>
          <ContactList />
        </section>
        <footer className="site-footer">
          <p>JRAG</p>
        </footer>
      </PageReveal>
    </>
  );
}

export default App;
