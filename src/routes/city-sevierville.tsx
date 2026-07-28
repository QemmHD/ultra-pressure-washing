import { LOCATION_BY_SLUG } from "../data/locations";
import {
  createRouteMeta,
  getRoute,
} from "../data/routes";
import CityPage from "../pages/CityPage";

const route = getRoute("/pressure-washing-sevierville");

export const meta = () => createRouteMeta(route);

export default function SeviervillePage() {
  return <CityPage location={LOCATION_BY_SLUG.get("sevierville")!} route={route} />;
}
