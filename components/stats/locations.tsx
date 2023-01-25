import { useState } from "react";
import { motion } from "framer-motion";
import BadgeSelect from "@/components/shared/badge-select";
import { COUNTRIES } from "@/lib/constants";
import { LocationTabs } from "@/lib/stats";
import { nFormatter } from "@/lib/utils";
import { LoadingCircle } from "../shared/icons";
import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import useProject from "@/lib/swr/use-project";

export default function Locations() {
  const [tab, setTab] = useState<LocationTabs>("country");
  const router = useRouter();

  const { slug, key, interval } = router.query as {
    slug?: string;
    key: string;
    interval?: string;
  };

  const { project: { domain } = {} } = useProject();

  const { data } = useSWR<{ country: string; city: string; clicks: number }[]>(
    router.isReady &&
      `${
        slug && domain
          ? `/api/projects/${slug}/domains/${domain}/links/${key}/stats/${tab}`
          : `/api/edge/links/${key}/stats/${tab}`
      }?interval=${interval || "24h"}`,
    fetcher,
  );

  const { data: totalClicks } = useSWR<number>(
    router.isReady &&
      `${
        slug && domain
          ? `/api/projects/${slug}/domains/${domain}/links/${key}/clicks`
          : `/api/edge/links/${key}/clicks`
      }?interval=${interval || "24h"}`,
    fetcher,
  );

  return (
    <div className="relative h-[420px] overflow-scroll border border-gray-200 bg-white px-7 py-5 scrollbar-hide  sm:rounded-lg sm:border-gray-100 sm:shadow-lg">
      <div className="mb-5 flex justify-between">
        <h1 className="text-xl font-semibold">Locations</h1>
        <BadgeSelect
          options={["country", "city"]}
          selected={tab}
          // @ts-ignore
          selectAction={setTab}
        />
      </div>
      <div
        className={
          data && data.length > 0
            ? "grid gap-4"
            : "flex h-[300px] items-center justify-center"
        }
      >
        {data ? (
          data.length > 0 ? (
            data.map(({ country, city, clicks }, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="relative z-10 flex w-full max-w-[calc(100%-3rem)] items-center">
                  <span className="z-10 flex items-center space-x-2 px-2">
                    <img
                      src={`https://flag.vercel.app/m/${country}.svg`}
                      className="h-3 w-5"
                    />
                    <p className="text-sm text-gray-800">
                      {tab === "country" ? COUNTRIES[country] : city}
                    </p>
                  </span>
                  <motion.div
                    style={{
                      width: `${(clicks / totalClicks) * 100}%`,
                    }}
                    className="absolute h-8 origin-left bg-orange-100"
                    transition={{ ease: "easeOut", duration: 0.3 }}
                    initial={{ transform: "scaleX(0)" }}
                    animate={{ transform: "scaleX(1)" }}
                  />
                </div>
                <p className="z-10 text-sm text-gray-600">
                  {nFormatter(clicks)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-600">No data available</p>
          )
        ) : (
          <LoadingCircle />
        )}
      </div>
    </div>
  );
}
