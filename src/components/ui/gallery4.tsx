import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export interface Gallery4Item {
  id: string;
  title: string;
  description: string;
  href: string;
  image: string;
  imageClassName?: string;
  isPrivate?: boolean;
}

export interface Gallery4Props {
  title?: string;
  description?: string;
  items: Gallery4Item[];
  headingId?: string;
}

function hasExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function GalleryCard({
  item,
  isActive,
  onFocusSlide,
}: {
  item: Gallery4Item;
  isActive: boolean;
  onFocusSlide: () => void;
}) {
  const canOpen = isActive && !item.isPrivate && hasExternalHref(item.href);
  const showPrivate = isActive && item.isPrivate;

  const card = (
    <div
      className={cn(
        "relative h-full min-h-[24rem] max-w-full overflow-hidden rounded-xl border border-border bg-card transition-opacity duration-200",
        isActive ? "opacity-100" : "opacity-45",
      )}
    >
      <img
        src={item.image}
        alt=""
        className={cn(
          "absolute h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
          item.imageClassName ?? "object-center",
        )}
      />
      <div className="absolute inset-0 h-full bg-[linear-gradient(rgba(17,17,16,0.05),rgba(17,17,16,0.28),rgba(17,17,16,0.92)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-5 text-foreground md:p-6">
        <div className="mb-2 text-xl font-medium">{item.title}</div>
        <div className="mb-5 line-clamp-3 text-sm text-muted-foreground">
          {item.description}
        </div>
        {canOpen ? (
          <div className="flex items-center text-sm text-foreground">
            Open{" "}
            <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
          </div>
        ) : showPrivate ? (
          <div className="text-sm text-muted-foreground">Private</div>
        ) : null}
      </div>
    </div>
  );

  if (canOpen) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group block rounded-xl no-underline"
      >
        {card}
      </a>
    );
  }

  if (!isActive) {
    return (
      <button
        type="button"
        onClick={onFocusSlide}
        className="group block w-full cursor-pointer rounded-xl border-0 bg-transparent p-0 text-left"
        aria-label={`Show ${item.title}`}
      >
        {card}
      </button>
    );
  }

  return <div className="rounded-xl">{card}</div>;
}

const AUTO_ADVANCE_MS = 2800;

const Gallery4 = ({
  title = "Selected work",
  description = "A few things I have shipped.",
  items,
  headingId = "work-heading",
}: Gallery4Props) => {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }
    const updateSelection = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    };
    updateSelection();
    carouselApi.on("select", updateSelection);
    carouselApi.on("reInit", updateSelection);
    return () => {
      carouselApi.off("select", updateSelection);
      carouselApi.off("reInit", updateSelection);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const inner = document.querySelector(".page-reveal__inner");
    let timer = 0;
    let hovering = false;

    const stop = () => {
      window.clearInterval(timer);
      timer = 0;
    };

    const start = () => {
      stop();
      if (hovering) {
        return;
      }
      if (inner && !inner.classList.contains("is-revealed")) {
        return;
      }
      if (document.visibilityState !== "visible") {
        return;
      }
      timer = window.setInterval(() => {
        carouselApi.scrollNext();
      }, AUTO_ADVANCE_MS);
    };

    const onPointerEnter = () => {
      hovering = true;
      stop();
    };
    const onPointerLeave = () => {
      hovering = false;
      start();
    };

    start();
    carouselApi.on("pointerDown", stop);
    carouselApi.on("pointerUp", start);
    const observer =
      inner &&
      new MutationObserver(start);
    observer?.observe(inner, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("visibilitychange", start);
    const root = document.querySelector(".gallery-fade");
    root?.addEventListener("pointerenter", onPointerEnter);
    root?.addEventListener("pointerleave", onPointerLeave);

    return () => {
      stop();
      carouselApi.off("pointerDown", stop);
      carouselApi.off("pointerUp", start);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", start);
      root?.removeEventListener("pointerenter", onPointerEnter);
      root?.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [carouselApi]);

  return (
    <section className="py-16 md:py-20" aria-labelledby={headingId}>
      <div className="mx-auto w-full max-w-[64rem] px-[var(--side-padding)]">
        <div className="mb-8 flex items-end justify-between border-b border-border pb-4 md:mb-10">
          <div className="flex max-w-lg flex-col gap-3">
            <h2
              id={headingId}
              className="text-sm font-normal lowercase tracking-wide text-muted-foreground"
            >
              {title}
            </h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="hidden shrink-0 gap-1 md:flex">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                carouselApi?.scrollPrev();
              }}
              className="text-muted-foreground hover:bg-transparent hover:text-accent"
              aria-label="Previous project"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                carouselApi?.scrollNext();
              }}
              className="text-muted-foreground hover:bg-transparent hover:text-accent"
              aria-label="Next project"
            >
              <ArrowRight className="size-5" />
            </Button>
          </div>
        </div>
      </div>
      <div className="gallery-fade mx-auto w-full max-w-[64rem]">
        <Carousel
          setApi={setCarouselApi}
          opts={{
            align: "center",
            loop: true,
          }}
        >
          <CarouselContent className="-ml-4">
            {items.map((item, index) => (
              <CarouselItem
                key={item.id}
                className="basis-[78%] pl-4 md:basis-[52%] lg:basis-[48%]"
              >
                <GalleryCard
                  item={item}
                  isActive={currentSlide === index}
                  onFocusSlide={() => carouselApi?.scrollTo(index)}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
      <div className="mt-8 flex justify-center gap-2">
        {items.map((_, index) => (
          <button
            key={index}
            type="button"
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              currentSlide === index ? "bg-accent" : "bg-accent/20",
            )}
            onClick={() => carouselApi?.scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export { Gallery4 };
