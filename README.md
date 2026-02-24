<div align="center">
  <img src=".github/assets/logo.png" alt="OTS Logo" width="350" />
  <h1>@studentsphere/ots-provider-wigor</h1>
</div>

<div align="center">
  <img src=".github/assets/wigor.png" alt="OTS Logo" width="100" />
  <b>Wigor Service E-EDT</b>
  <p>Wigor is the central ERP system for the C&D and IGENIA Education groups, providing integrated management for the schools listed below.</p>
</div>

Wigor Timetable implementation of an Open Timetable Scraper (OTS) provider

> [!CAUTION]
> **LEGAL DISCLAIMER AND LIMITATION OF LIABILITY**
>
> This project, `@studentsphere/ots-provider-wigor`, is an independent open-source tool. It is **not affiliated with, authorized, maintained, sponsored, or endorsed** by the **[Compétences & Développement (C&D)](https://www.competences-developpement.com)** group, **[IGENSIA Education](https://www.igensia-education.fr)**, or the developers of the **[WigorServices](http://wigorservices.net)** platform.
>
> 1. **Intellectual Property:** All trademarks, logos, and brand names are the property of their respective owners. Their mention here is strictly for identification and compatibility purposes and does not imply any association.
> 2. **Responsible Use:** This tool is provided for educational purposes and to facilitate interoperability. It is the end-user's sole responsibility to ensure that using this scraper complies with their institution's Terms of Service (ToS) and local laws regarding automated data access.
> 3. **No Warranty:** The software is provided "as is", without warranty of any kind. The developer assumes no liability for account suspensions, access blocks, or any legal actions taken by the aforementioned groups resulting from the use of this tool.
> 4. **Service Changes:** Since this tool relies on parsing third-party web pages, functionality may break at any time due to updates on the official WigorServices portals.
>
> **By using this package, you acknowledge and agree to these terms in full.**

This provider specializes in extracting and retrieving data from Wigor-based school portals. It automates the connection and parsing of Wigor timetables, converting raw HTML into a clean, standardized format for the Open Timetable Scrapper ecosystem.

## Installation

```bash
npm install @studentsphere/ots-provider-wigor
```

## Features

- **Wigor System Support**: Specifically designed to interface with Wigor-based timetable portals.
- **CAS Authentication**: Automatically handles Central Authentication Service (CAS) login flows.
- **Multi-School Support**: Built-in support for numerous schools and campuses using the Wigor system.
- **Standardized Output**: Converts complex HTML timetable grids into clean, standardized `Course` objects defined by `@studentsphere/ots-core`.

## Usage

To use the Wigor provider in your application, instantiate the `WigorProvider` class. You can then validate user credentials and fetch their schedule.

```typescript
import { WigorProvider } from "@studentsphere/ots-provider-wigor";

const provider = new WigorProvider();

// 1. Validate credentials
const isValid = await provider.validateCredentials({
  identifier: "student_username",
  password: "student_password"
});

if (isValid) {
  // 2. Fetch the schedule for a specific date range
  const fromDate = new Date("2026-10-01T00:00:00Z");
  const toDate = new Date("2026-10-31T23:59:59Z");

  const courses = await provider.getSchedule(
    {
      identifier: "student_username",
      password: "student_password"
    },
    fromDate,
    toDate
  );

  console.log(courses);
}
```

## Supported C&D and IGENSIA Education Schools

| Logo                                                                         | Institution                |
| ---------------------------------------------------------------------------- | -------------------------- |
| <img src=".github/assets/schools/3a.png" width="50">                         | 3A                         |
| <img src=".github/assets/schools/epsi.png" width="50">                       | EPSI                       |
| <img src=".github/assets/schools/esail.png" width="50">                      | ESAIL                      |
| <img src=".github/assets/schools/icl.png" width="50">                        | ICL                        |
| <img src=".github/assets/schools/idrac_business_school.png" width="50">      | IDRAC Business School      |
| <img src=".github/assets/schools/ieft.png" width="50">                       | IEFT                       |
| <img src=".github/assets/schools/iet.png" width="50">                        | IET                        |
| <img src=".github/assets/schools/ifag.png" width="50">                       | IFAG                       |
| <img src=".github/assets/schools/igefi.png" width="50">                      | IGEFI                      |
| <img src=".github/assets/schools/ihedrea.png" width="50">                    | IHEDREA                    |
| <img src=".github/assets/schools/ileri.png" width="50">                      | ILERI                      |
| <img src=".github/assets/schools/sup_de_com.png" width="50">                 | SUP' DE COM                |
| <img src=".github/assets/schools/viva_mundi.png" width="50">                 | VIVA MUNDI                 |
| <img src=".github/assets/schools/wis.png" width="50">                        | WIS                        |
| <img src=".github/assets/schools/american_business_college.png" width="50">  | American Business College  |
| <img src=".github/assets/schools/esam.png" width="50">                       | ESAM                       |
| <img src=".github/assets/schools/icd_business_school.png" width="50">        | ICD BUSINESS SCHOOL        |
| <img src=".github/assets/schools/igensia_rh.png" width="50">                 | IGENSIA RH                 |
| <img src=".github/assets/schools/imis.png" width="50">                       | IMIS                       |
| <img src=".github/assets/schools/imsi.png" width="50">                       | IMSI                       |
| <img src=".github/assets/schools/ipi.png" width="50">                        | IPI                        |
| <img src=".github/assets/schools/iscpa.png" width="50">                      | ISCPA                      |
| <img src=".github/assets/schools/ismm.png" width="50">                       | ISMM                       |
| <img src=".github/assets/schools/cnva.png" width="50">                       | CNVA                       |
| <img src=".github/assets/schools/business_science_institute.png" width="50"> | Business Science Institute |
| <img src=".github/assets/schools/ecm.png" width="50">                        | ECM                        |
| <img src=".github/assets/schools/emi.png" width="50">                        | EMI                        |
| <img src=".github/assets/schools/esa.png" width="50">                        | ESA                        |

## Dependencies

This provider relies on several key packages to function:
- `axios` & `axios-cookiejar-support`: For handling HTTP requests and maintaining session cookies.
- `cheerio`: For parsing and extracting data from the Wigor HTML timetable grids.
- `tough-cookie`: For robust cookie management during the authentication flow.
- `p-limit`: For managing concurrency when fetching multiple weeks of schedule data.

## License

MIT
