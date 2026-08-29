"use client";

import {
  useState,
  type ChangeEvent,
} from "react";

import * as XLSX from "xlsx";

import {
  getSupabaseClient,
} from "../lib/supabase";


type ExcelFacultyRow = {
  full_name: string;
  department: string;
  designation: string;

  qualification: string;
  specialization: string;
  experience: string;

  email: string;
  bio: string;

  photo_url: string;
  profile_url: string;

  is_hod: boolean;
  is_featured: boolean;

  leadership_role:
    | "Dean"
    | "HOD"
    | "Domain Head"
    | "Program Coordinator"
    | "Faculty";

  domain: string;

  leadership_priority: number;

  display_order: number;

  status:
    | "Active"
    | "Inactive";
};


type ImportResult = {
  inserted?: number;
  updated?: number;
  skipped?: number;
  processed?: number;
};


export function FacultyExcelImport({
  onImported,
}: {
  onImported?: () => void;
}) {

  const [
    rows,
    setRows,
  ] =
    useState<
      ExcelFacultyRow[]
    >([]);


  const [
    fileName,
    setFileName,
  ] =
    useState("");


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    success,
    setSuccess,
  ] =
    useState("");


  const [
    importing,
    setImporting,
  ] =
    useState(false);


  // =========================================================
  // BOOLEAN NORMALIZER
  // =========================================================

  const asBoolean =
    (
      value: unknown
    ) => {

      if (
        value === true ||
        value === 1
      ) {
        return true;
      }


      const normalized =
        String(
          value ?? ""
        )
          .trim()
          .toLowerCase();


      return [
        "true",
        "yes",
        "y",
        "1",
      ].includes(
        normalized
      );
    };


  // =========================================================
  // DOWNLOAD TEMPLATE
  // =========================================================

  const downloadTemplate =
    () => {

      const template = [
        {
          full_name:
            "Dr. Example Faculty",

          department:
            "ECE",

          designation:
            "Professor",

          qualification:
            "Ph.D., M.Tech",

          specialization:
            "VLSI and Embedded Systems",

          experience:
            "18 Years",

          email:
            "faculty@rnsit.ac.in",

          bio:
            "Researcher and educator working in VLSI and embedded systems.",

          photo_url:
            "",

          profile_url:
            "",

          is_hod:
            "No",

          is_featured:
            "Yes",

          leadership_role:
            "Domain Head",

          domain:
            "VLSI & Semiconductor Systems",

          leadership_priority:
            30,

          display_order:
            10,

          status:
            "Active",
        },

        {
          full_name:
            "Dr. Example HOD",

          department:
            "CSE",

          designation:
            "HOD",

          qualification:
            "Ph.D.",

          specialization:
            "Artificial Intelligence",

          experience:
            "20 Years",

          email:
            "hod.cse@rnsit.ac.in",

          bio:
            "Head of the Department.",

          photo_url:
            "",

          profile_url:
            "",

          is_hod:
            "Yes",

          is_featured:
            "Yes",

          display_order:
            1,

          status:
            "Active",
        },
      ];


      const worksheet =
        XLSX.utils
          .json_to_sheet(
            template
          );


      worksheet["!cols"] = [
        {wch: 28},
        {wch: 15},
        {wch: 24},
        {wch: 28},
        {wch: 34},
        {wch: 18},
        {wch: 34},
        {wch: 55},
        {wch: 45},
        {wch: 45},
        {wch: 12},
        {wch: 14},
        {wch: 14},
        {wch: 12},
      ];


      const workbook =
        XLSX.utils
          .book_new();


      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Faculty"
      );


      XLSX.writeFile(
        workbook,
        "CampusConnect-Faculty-Template.xlsx"
      );
    };


  // =========================================================
  // READ EXCEL
  // =========================================================

  const readExcel =
    async (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {

      const file =
        event.target
          .files?.[0];


      if (!file) {
        return;
      }


      setError("");
      setSuccess("");
      setRows([]);
      setFileName(
        file.name
      );


      try {

        const buffer =
          await file
            .arrayBuffer();


        const workbook =
          XLSX.read(
            buffer,
            {
              type:
                "array",
            }
          );


        const firstSheet =
          workbook
            .SheetNames[0];


        if (!firstSheet) {
          throw new Error(
            "This Excel file does not contain a worksheet."
          );
        }


        const worksheet =
          workbook
            .Sheets[
              firstSheet
            ];


        const rawRows =
          XLSX.utils
            .sheet_to_json<
              Record<
                string,
                unknown
              >
            >(
              worksheet,
              {
                defval: "",
              }
            );


        if (
          !rawRows.length
        ) {
          throw new Error(
            "The Excel sheet is empty."
          );
        }


        const normalized:
          ExcelFacultyRow[] =
          rawRows.map(
            (
              item,
              index
            ) => {

              const fullName =
                String(
                  item.full_name ??
                  ""
                ).trim();


              const department =
                String(
                  item.department ??
                  ""
                )
                  .trim()
                  .toUpperCase();


              const designation =
                String(
                  item.designation ??
                  ""
                ).trim();


              if (
                !fullName ||
                !department ||
                !designation
              ) {
                throw new Error(
                  `Row ${index + 2}: full_name, department and designation are required.`
                );
              }


              const rawStatus =
                String(
                  item.status ||
                  "Active"
                ).trim();


              return {
                full_name:
                  fullName,

                department,

                designation,

                qualification:
                  String(
                    item.qualification ??
                    ""
                  ).trim(),

                specialization:
                  String(
                    item.specialization ??
                    ""
                  ).trim(),

                experience:
                  String(
                    item.experience ??
                    ""
                  ).trim(),

                email:
                  String(
                    item.email ??
                    ""
                  )
                    .trim()
                    .toLowerCase(),

                bio:
                  String(
                    item.bio ??
                    ""
                  ).trim(),

                photo_url:
                  String(
                    item.photo_url ??
                    ""
                  ).trim(),

                profile_url:
                  String(
                    item.profile_url ??
                    ""
                  ).trim(),

                is_hod:
                  asBoolean(
                    item.is_hod
                  ),

                is_featured:
                  asBoolean(
                    item.is_featured
                  ),

                leadership_role:
                  (
                    [
                      "Dean",
                      "HOD",
                      "Domain Head",
                      "Program Coordinator",
                      "Faculty",
                    ].includes(
                      String(
                        item.leadership_role ||
                        ""
                      ).trim()
                    )
                      ? String(
                          item.leadership_role
                        ).trim()
                      : (
                          asBoolean(
                            item.is_hod
                          )
                            ? "HOD"
                            : "Faculty"
                        )
                  ) as ExcelFacultyRow["leadership_role"],

                domain:
                  String(
                    item.domain ??
                    ""
                  ).trim(),

                leadership_priority:
                  Number(
                    item.leadership_priority ||
                    (
                      String(
                        item.leadership_role ||
                        ""
                      ) === "Dean"
                        ? 10
                        : asBoolean(
                            item.is_hod
                          )
                        ? 20
                        : String(
                            item.leadership_role ||
                            ""
                          ) === "Domain Head"
                        ? 30
                        : 100
                    )
                  ),

                display_order:
                  Number(
                    item.display_order ||
                    100
                  ),

                status:
                  rawStatus ===
                    "Inactive"
                    ? "Inactive"
                    : "Active",
              };

            }
          );


        setRows(
          normalized
        );


        setSuccess(
          `${normalized.length} faculty record${normalized.length === 1 ? "" : "s"} ready to import.`
        );

      } catch (
        caught
      ) {

        setRows([]);

        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to read Excel file."
        );

      } finally {

        event.target.value =
          "";

      }
    };


  // =========================================================
  // IMPORT
  // =========================================================

  const importFaculty =
    async () => {

      if (
        !rows.length ||
        importing
      ) {
        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {

        setError(
          "CampusConnect is not connected to Supabase."
        );

        return;
      }


      setImporting(
        true
      );

      setError("");
      setSuccess("");


      try {

        const {
          data,
          error:
            importError,
        } =
          await client.rpc(
            "bulk_import_faculty",
            {
              rows,
            }
          );


        if (
          importError
        ) {
          throw importError;
        }


        const result =
          (
            data ||
            {}
          ) as
            ImportResult;


        setSuccess(
          `Import complete · ${result.inserted || 0} added · ${result.updated || 0} updated · ${result.skipped || 0} skipped.`
        );


        setRows([]);
        setFileName("");


        onImported?.();

      } catch (
        caught
      ) {

        setError(
          caught instanceof Error
            ? caught.message
            : "Faculty import failed."
        );

      } finally {

        setImporting(
          false
        );

      }
    };


  return (
    <section className="facultyExcelImporter">

      <div className="facultyExcelIntro">

        <span>
          BULK FACULTY MANAGEMENT
        </span>

        <h3>
          Import faculty from Excel
        </h3>

        <p>
          Download the CampusConnect template,
          fill one faculty member per row,
          then upload it here.
        </p>

      </div>


      <div className="facultyExcelActions">

        <button
          type="button"
          className="facultyExcelTemplate"
          onClick={
            downloadTemplate
          }
        >
          <span>
            ↓
          </span>

          <div>
            <b>
              Download Excel template
            </b>

            <small>
              CampusConnect-Faculty-Template.xlsx
            </small>
          </div>
        </button>


        <label className="facultyExcelUpload">

          <span>
            ↑
          </span>

          <div>
            <b>
              Upload completed Excel
            </b>

            <small>
              .xlsx or .xls
            </small>
          </div>


          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={
              readExcel
            }
          />

        </label>

      </div>


      {fileName && (
        <div className="facultyExcelFile">

          <span>
            XLSX
          </span>

          <div>
            <b>
              {fileName}
            </b>

            <small>
              {rows.length} validated rows
            </small>
          </div>

        </div>
      )}


      {error && (
        <div className="facultyExcelError">
          {error}
        </div>
      )}


      {success && (
        <div className="facultyExcelSuccess">
          {success}
        </div>
      )}


      {rows.length > 0 && (
        <>

          <div className="facultyExcelPreviewHeader">

            <div>
              <span>
                IMPORT PREVIEW
              </span>

              <strong>
                Review before publishing
              </strong>
            </div>


            <small>
              {rows.length} records
            </small>

          </div>


          <div className="facultyExcelTableWrap">

            <table className="facultyExcelTable">

              <thead>
                <tr>
                  <th>
                    Faculty
                  </th>

                  <th>
                    Branch
                  </th>

                  <th>
                    Designation
                  </th>

                  <th>
                    Education
                  </th>

                  <th>
                    Email
                  </th>

                  <th>
                    Type
                  </th>
                </tr>
              </thead>


              <tbody>

                {rows
                  .slice(
                    0,
                    10
                  )
                  .map(
                    (
                      item,
                      index
                    ) => (

                      <tr
                        key={
                          `${item.email}-${index}`
                        }
                      >

                        <td>
                          <strong>
                            {item.full_name}
                          </strong>

                          <small>
                            {item.specialization ||
                              "No specialization"}
                          </small>
                        </td>


                        <td>
                          <span className="facultyExcelDepartment">
                            {item.department}
                          </span>
                        </td>


                        <td>
                          {item.is_hod
                            ? "HOD"
                            : item.designation}
                        </td>


                        <td>
                          {item.qualification ||
                            "—"}
                        </td>


                        <td>
                          {item.email ||
                            "—"}
                        </td>


                        <td>

                          {item.is_hod ? (
                            <span className="facultyExcelHod">
                              HOD
                            </span>
                          ) : (
                            <span>
                              Faculty
                            </span>
                          )}

                        </td>

                      </tr>

                    )
                  )}

              </tbody>

            </table>

          </div>


          {rows.length > 10 && (
            <p className="facultyExcelMore">
              + {rows.length - 10} additional records
            </p>
          )}


          <div className="facultyExcelPublish">

            <div>
              <b>
                Ready to publish?
              </b>

              <small>
                Existing records are updated automatically when
                the official email or name + department matches.
              </small>
            </div>


            <button
              type="button"
              disabled={
                importing
              }
              onClick={
                importFaculty
              }
            >
              {importing
                ? "Importing..."
                : `Import ${rows.length} faculty`}
            </button>

          </div>

        </>
      )}

    </section>
  );
}
