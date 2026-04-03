import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "./context";

vi.mock("./context", () => ({
  useAuth: vi.fn(),
}));

describe("ProtectedRoute", () => {
  it("renders protected content when user has an allowed role", () => {
    vi.mocked(useAuth).mockReturnValue({
      userRoles: ["admin"],
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={["/secure"]}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/secure" element={<div>Secure Page</div>} />
          </Route>
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Secure Page")).toBeInTheDocument();
  });

  it("redirects to home when user lacks required role", () => {
    vi.mocked(useAuth).mockReturnValue({
      userRoles: ["viewer"],
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={["/secure"]}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/secure" element={<div>Secure Page</div>} />
          </Route>
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("allows access when no roles are required", () => {
    vi.mocked(useAuth).mockReturnValue({
      userRoles: [],
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={["/secure"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/secure" element={<div>Secure Page</div>} />
          </Route>
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Secure Page")).toBeInTheDocument();
  });
});
