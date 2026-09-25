"use client";

import {
  useState,
} from "react";

import {
  NativeDelete,
} from "@/components/ui/delete-button";


export default function DeleteButtonDemo() {

  const [
    deleted,
    setDeleted,
  ] = useState(false);


  return (
    <div className="flex min-h-24 items-center">

      {!deleted ? (

        <NativeDelete
          onConfirm={() => {
            console.log(
              "Delete confirmation opened"
            );
          }}
          onDelete={() => {

            setDeleted(
              true
            );

            window.setTimeout(
              () =>
                setDeleted(
                  false
                ),
              2000
            );

          }}
        />

      ) : (

        <div
          role="status"
          className="text-sm text-slate-500"
        >
          Deleted successfully.
        </div>

      )}

    </div>
  );
}
