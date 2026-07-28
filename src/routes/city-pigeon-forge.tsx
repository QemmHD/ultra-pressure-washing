import { LOCATION_BY_SLUG } from "../data/locations";
import {
  createRouteMeta,
  getRoute,
} from "../data/routes";
import CityPage from "../pages/CityPage";

const route = getRoute("/pressure-washing-pigeon-forge");

export const meta = () => createRouteMeta(route);

export default function PigeonForgePage() {
  return <CityPage location={LOCATION_BY_SLUG.get("pigeon-forge")!} route={route} />;
}
