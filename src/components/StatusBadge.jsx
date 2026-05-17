import React from "react";
import clsx from "clsx";
import { getStatusColor } from "../lib/utils";

export default function StatusBadge({ status }) {
  return (
    <span className={clsx("tag border", getStatusColor(status))}>{status}</span>
  );
}