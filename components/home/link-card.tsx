import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimation, useMotionValue } from "framer-motion";
import toast from "react-hot-toast";
import useSWR from "swr";
import { useLinkQRModal } from "@/components/app/modals/link-qr-modal";
import BlurImage from "@/components/shared/blur-image";
import CopyButton from "@/components/shared/copy-button";
import { Chart, LoadingDots, QR, ThreeDots } from "@/components/shared/icons";
import {
  DEFAULT_LINK_PROPS,
  FRAMER_MOTION_LIST_ITEM_VARIANTS,
} from "@/lib/constants";
import { SimpleLinkProps } from "@/lib/types";
import {
  fetcher,
  getApexDomain,
  linkConstructor,
  nFormatter,
} from "@/lib/utils";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";

export default function LinkCard({
  _key: key,
  url,
  hashes,
  setHashes,
  setShowDefaultLink,
}: {
  _key: string;
  url: string;
  hashes?: SimpleLinkProps[];
  setHashes?: (hashes: SimpleLinkProps[]) => void;
  setShowDefaultLink?: (showDefaultLink: boolean) => void;
}) {
  const apexDomain = getApexDomain(url);

  const cardElem = useRef(null);

  const x = useMotionValue(0);
  const controls = useAnimation();

  const [constrained, setConstrained] = useState(true);

  const [velocity, setVelocity] = useState<number>();

  const isDelete = (childNode, parentNode) => {
    const childRect = childNode.getBoundingClientRect();
    const parentRect = parentNode.getBoundingClientRect();
    return parentRect.left >= childRect.right ||
      parentRect.right <= childRect.left
      ? true
      : undefined;
  };

  // determine direction of swipe based on velocity
  const direction = useMemo(() => {
    return velocity >= 1 ? "right" : velocity <= -1 ? "left" : undefined;
  }, [velocity]);

  const flyAway = (min) => {
    const flyAwayDistance = (direction) => {
      const parentWidth =
        cardElem.current.parentNode.getBoundingClientRect().width;
      const childWidth = cardElem.current.getBoundingClientRect().width;
      return direction === "left"
        ? -parentWidth / 2 - childWidth / 2
        : parentWidth / 2 + childWidth / 2;
    };
    if (direction && Math.abs(velocity) > min) {
      console.log("flying away");
      setConstrained(false);
      controls.start({
        x: flyAwayDistance(direction),
      });
    }
  };

  useEffect(() => {
    const unsubscribeX = x.onChange(() => {
      if (cardElem.current) {
        const childNode = cardElem.current;
        const parentNode = cardElem.current.parentNode;
        const deleted = isDelete(childNode, parentNode);
        if (deleted) {
          toast.success("Link deleted.");
          if (setShowDefaultLink) {
            setShowDefaultLink(false);
          }
          if (hashes && setHashes) {
            setHashes(hashes.filter((hash) => hash.key !== key));
          }
        }
      }
    });

    return () => unsubscribeX();
  });

  const { showLinkQRModal, setShowLinkQRModal, LinkQRModal } = useLinkQRModal({
    props: {
      key,
      url,
    },
  });

  const { showAddEditLinkModal, setShowAddEditLinkModal, AddEditLinkModal } =
    useAddEditLinkModal({
      props: {
        ...DEFAULT_LINK_PROPS,
        key,
        url,
      },
      homepageDemo: true,
    });

  const { data: clicks } = useSWR<number>(
    `/api/edge/links/${key}/clicks`,
    fetcher,
    {
      // avoid revalidation on focus when modals are open to prevent rerendering
      revalidateOnFocus: !showLinkQRModal && !showAddEditLinkModal,
    },
  );

  return (
    <motion.li variants={FRAMER_MOTION_LIST_ITEM_VARIANTS}>
      <LinkQRModal />
      <AddEditLinkModal />
      <motion.div
        animate={controls}
        drag="x"
        dragConstraints={constrained && { left: 0, right: 0 }}
        dragElastic={1}
        ref={cardElem}
        style={{ x }}
        onDrag={() => setVelocity(x.getVelocity())}
        onDragEnd={() => flyAway(500)}
        whileTap={{ scale: 1.05 }}
        className="flex max-w-md cursor-grab items-center justify-between rounded-md border border-gray-200 bg-white p-3 shadow-lg transition-[border-color] hover:border-black active:cursor-grabbing"
      >
        <div className="flex items-center space-x-3">
          <BlurImage
            src={`https://www.google.com/s2/favicons?sz=64&domain_url=${apexDomain}`}
            alt={apexDomain}
            className="pointer-events-none h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
          <div>
            <div className="mb-1 flex items-center space-x-2">
              <a
                className="font-semibold text-blue-800"
                href={linkConstructor({ key })}
                target="_blank"
                rel="noreferrer"
              >
                {linkConstructor({ key, pretty: true })}
              </a>
              <CopyButton url={linkConstructor({ key })} />
              <button
                onClick={() => setShowLinkQRModal(true)}
                className="group rounded-full bg-gray-100 p-1.5 transition-all duration-75 hover:scale-105 hover:bg-blue-100 active:scale-95"
              >
                <span className="sr-only">Copy</span>
                <QR className="text-gray-700 transition-all group-hover:text-blue-800" />
              </button>
              <Link
                href={{ pathname: "/", query: { key } }}
                as={`/stats/${encodeURI(key)}`}
                shallow
                scroll={false}
                className="flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-0.5 text-gray-700 transition-all duration-75 hover:scale-105 active:scale-95"
              >
                <Chart className="h-4 w-4" />
                <p className="text-sm">
                  {!clicks && clicks != 0 ? (
                    <LoadingDots color="#71717A" />
                  ) : (
                    nFormatter(clicks)
                  )}
                  <span className="ml-1 hidden sm:inline-block">clicks</span>
                </p>
              </Link>
            </div>
            <p className="w-72 truncate text-sm text-gray-500">{url}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAddEditLinkModal(true)}
          className="rounded-md px-1 py-2 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
        >
          <ThreeDots className="h-5 w-5 text-gray-500" />
        </button>
      </motion.div>
    </motion.li>
  );
}
