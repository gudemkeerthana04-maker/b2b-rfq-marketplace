import { useEffect, useState } from "react";
import type { FormEvent } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type User = {
  id: number;
  name: string;
  email: string;
  role: "BUYER" | "SUPPLIER";
};

type RFQ = {
  id: number;
  productName: string;
  description: string;
  quantity: number;
  deliveryLocation: string;
  deadline: string;
};

type SupplierRFQ = RFQ & {
  buyer?: {
    id: number;
    name: string;
  };
};

type Quotation = {
  id: number;
  quotedPrice: number;
  deliveryTime: string;
  message?: string;
  supplier?: {
    id: number;
    name: string;
    email: string;
  };
};

type SupplierQuotation = {
  id: number;
  quotedPrice: number;
  deliveryTime: string;
  message?: string;
  createdAt: string;
  rfq: {
    id: number;
    productName: string;
    description: string;
    quantity: number;
    deliveryLocation: string;
    deadline: string;
  };
};

const getMinDateTime = () => {
  const now = new Date();

  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

  return now.toISOString().slice(0, 16);
};

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"BUYER" | "SUPPLIER">("BUYER");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [availableRfqs, setAvailableRfqs] = useState<SupplierRFQ[]>([]);
  const [loadingRfqs, setLoadingRfqs] = useState(false);
  const [rfqError, setRfqError] = useState("");

  // Supplier search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [deadlineFilter, setDeadlineFilter] = useState("");

  // Create RFQ state
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [creatingRfq, setCreatingRfq] = useState(false);

  // Edit RFQ state
  const [editingRfqId, setEditingRfqId] = useState<number | null>(null);
  const [editProductName, setEditProductName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editDeliveryLocation, setEditDeliveryLocation] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [updatingRfq, setUpdatingRfq] = useState(false);
  const [deletingRfqId, setDeletingRfqId] = useState<number | null>(null);

  // Quotation state
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null);
  const [quotedPrice, setQuotedPrice] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [quotationMessage, setQuotationMessage] = useState("");
  const [submittingQuotation, setSubmittingQuotation] = useState(false);

  // Buyer quotation viewing state
  const [selectedQuotationRfqId, setSelectedQuotationRfqId] =
    useState<number | null>(null);

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);

  // Supplier previous submissions state
  const [previousSubmissions, setPreviousSubmissions] = useState<
    SupplierQuotation[]
  >([]);
  const [loadingPreviousSubmissions, setLoadingPreviousSubmissions] =
    useState(false);
  const [previousSubmissionsError, setPreviousSubmissionsError] =
    useState("");

  // Login / Signup
  const handleAuth = async (event: FormEvent) => {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const endpoint = isLogin
        ? `${API_URL}/api/auth/login`
        : `${API_URL}/api/auth/signup`;

      const body = isLogin
        ? {
            email,
            password,
          }
        : {
            name,
            email,
            password,
            role,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Something went wrong");
        return;
      }

      if (isLogin) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        setUser(data.user);
        setMessage("");
      } else {
        setMessage("Account created successfully. You can now log in.");

        setIsLogin(true);
        setName("");
        setPassword("");
      }
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // Load buyer's RFQs
  const loadRfqs = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/rfqs/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setRfqs(data.rfqs || []);
      } else {
        setMessage(data.message || "Failed to load RFQs.");
      }
    } catch {
      setMessage("Failed to load RFQs.");
    }
  };

  // Load supplier's available RFQs
  const loadAvailableRfqs = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    setLoadingRfqs(true);
    setRfqError("");

    try {
      const response = await fetch(`${API_URL}/api/rfqs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setRfqError(data.message || "Failed to load RFQs.");
        return;
      }

      setAvailableRfqs(data.rfqs || []);
    } catch {
      setRfqError("Unable to connect to the server.");
    } finally {
      setLoadingRfqs(false);
    }
  };

  // Load buyer quotations for one RFQ
  const loadQuotations = async (rfqId: number) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please log in again.");
      return;
    }

    setSelectedQuotationRfqId(rfqId);
    setQuotations([]);
    setLoadingQuotations(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/rfqs/${rfqId}/quotations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to load quotations.");
        return;
      }

      setQuotations(data.quotations || []);
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setLoadingQuotations(false);
    }
  };

  // Load supplier's previous quotation submissions
  const loadPreviousSubmissions = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setPreviousSubmissionsError("Please log in again.");
      return;
    }

    setLoadingPreviousSubmissions(true);
    setPreviousSubmissionsError("");

    try {
      const response = await fetch(
        `${API_URL}/api/rfqs/quotations/my`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setPreviousSubmissionsError(
          data.message || "Failed to load previous submissions."
        );
        return;
      }

      setPreviousSubmissions(data.quotations || []);
    } catch {
      setPreviousSubmissionsError("Unable to connect to the server.");
    } finally {
      setLoadingPreviousSubmissions(false);
    }
  };

  // Start editing an RFQ
  const startEditingRfq = (rfq: RFQ) => {
    setEditingRfqId(rfq.id);

    setEditProductName(rfq.productName);
    setEditDescription(rfq.description);
    setEditQuantity(String(rfq.quantity));
    setEditDeliveryLocation(rfq.deliveryLocation);

    const date = new Date(rfq.deadline);

    const localDateTime = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    setEditDeadline(localDateTime);

    setMessage("");
    setSelectedQuotationRfqId(null);
  };

  // Cancel editing
  const cancelEditingRfq = () => {
    setEditingRfqId(null);
    setEditProductName("");
    setEditDescription("");
    setEditQuantity("");
    setEditDeliveryLocation("");
    setEditDeadline("");
  };

  // Update RFQ
  const updateRfq = async (event: FormEvent) => {
    event.preventDefault();

    if (editingRfqId === null) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please log in again.");
      return;
    }

    setUpdatingRfq(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/rfqs/${editingRfqId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productName: editProductName,
            description: editDescription,
            quantity: Number(editQuantity),
            deliveryLocation: editDeliveryLocation,
            deadline: new Date(editDeadline).toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to update RFQ.");
        return;
      }

      setMessage("RFQ updated successfully.");

      cancelEditingRfq();
      loadRfqs();
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setUpdatingRfq(false);
    }
  };

  // Delete RFQ
  const deleteRfq = async (rfqId: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this RFQ?"
    );

    if (!confirmed) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please log in again.");
      return;
    }

    setDeletingRfqId(rfqId);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/rfqs/${rfqId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to delete RFQ.");
        return;
      }

      setMessage("RFQ deleted successfully.");

      if (selectedQuotationRfqId === rfqId) {
        setSelectedQuotationRfqId(null);
        setQuotations([]);
      }

      loadRfqs();
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setDeletingRfqId(null);
    }
  };

  // Load data after login
  useEffect(() => {
    if (user?.role === "BUYER") {
      loadRfqs();
    }

    if (user?.role === "SUPPLIER") {
      loadAvailableRfqs();
      loadPreviousSubmissions();
    }
  }, [user]);

  // Create RFQ
  const createRfq = async (event: FormEvent) => {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please log in again.");
      return;
    }

    setCreatingRfq(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/rfqs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productName,
          description,
          quantity: Number(quantity),
          deliveryLocation,
          deadline: new Date(deadline).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to create RFQ.");
        return;
      }

      setMessage("RFQ created successfully.");

      setProductName("");
      setDescription("");
      setQuantity("");
      setDeliveryLocation("");
      setDeadline("");

      loadRfqs();
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setCreatingRfq(false);
    }
  };

  // Submit quotation
  const submitQuotation = async (event: FormEvent) => {
    event.preventDefault();

    if (selectedRfqId === null) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setRfqError("Please log in again.");
      return;
    }

    setSubmittingQuotation(true);
    setRfqError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/rfqs/${selectedRfqId}/quotations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quotedPrice: Number(quotedPrice),
            deliveryTime,
            message: quotationMessage || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setRfqError(data.message || "Failed to submit quotation.");
        return;
      }

      setMessage("Quotation submitted successfully.");

      setSelectedRfqId(null);
      setQuotedPrice("");
      setDeliveryTime("");
      setQuotationMessage("");

      loadPreviousSubmissions();
    } catch {
      setRfqError("Unable to connect to the server.");
    } finally {
      setSubmittingQuotation(false);
    }
  };

  // Filter supplier RFQs
  const filteredRfqs = availableRfqs.filter((rfq) => {
    const search = searchTerm.trim().toLowerCase();
    const location = locationFilter.trim().toLowerCase();

    const matchesSearch =
      search === "" ||
      rfq.productName.toLowerCase().includes(search) ||
      rfq.description.toLowerCase().includes(search);

    const matchesLocation =
      location === "" ||
      rfq.deliveryLocation.toLowerCase().includes(location);

    const matchesDeadline =
      deadlineFilter === "" ||
      new Date(rfq.deadline) <= new Date(`${deadlineFilter}T23:59:59`);

    return matchesSearch && matchesLocation && matchesDeadline;
  });

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setRfqs([]);
    setAvailableRfqs([]);
    setQuotations([]);
    setPreviousSubmissions([]);
    setSelectedQuotationRfqId(null);
    setSelectedRfqId(null);

    setSearchTerm("");
    setLocationFilter("");
    setDeadlineFilter("");
  };

  // Logged-in dashboard
  if (user) {
    return (
      <div className="app">
        <div className="dashboard">
          <header className="dashboard-header">
            <div>
              <h1>B2B RFQ Marketplace</h1>

              <p>
                Welcome, <strong>{user.name}</strong>
              </p>
            </div>

            <button onClick={logout}>Logout</button>
          </header>

          {/* =========================
              BUYER DASHBOARD
          ========================= */}
          {user.role === "BUYER" && (
            <section>
              <h2>Buyer Dashboard</h2>

              <div className="dashboard-card">
                <h3>Create New RFQ</h3>

                <form onSubmit={createRfq}>
                  <label>
                    Product / Service Name

                    <input
                      type="text"
                      value={productName}
                      onChange={(event) =>
                        setProductName(event.target.value)
                      }
                      placeholder="Example: Office Chairs"
                      required
                    />
                  </label>

                  <label>
                    Description

                    <textarea
                      value={description}
                      onChange={(event) =>
                        setDescription(event.target.value)
                      }
                      placeholder="Describe what you need"
                      required
                    />
                  </label>

                  <label>
                    Quantity

                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    Delivery Location

                    <input
                      type="text"
                      value={deliveryLocation}
                      onChange={(event) =>
                        setDeliveryLocation(event.target.value)
                      }
                      placeholder="Example: Hyderabad"
                      required
                    />
                  </label>

                  <label>
                    Deadline

                    <input
                      type="datetime-local"
                      min={getMinDateTime()}
                      value={deadline}
                      onChange={(event) =>
                        setDeadline(event.target.value)
                      }
                      required
                    />
                  </label>

                  <button
                    className="submit-button"
                    type="submit"
                    disabled={creatingRfq}
                  >
                    {creatingRfq ? "Creating..." : "Create RFQ"}
                  </button>
                </form>
              </div>

              <div className="dashboard-card">
                <h3>My RFQs</h3>

                {rfqs.length === 0 ? (
                  <p>No RFQs found.</p>
                ) : (
                  <div>
                    {rfqs.map((rfq) => (
                      <div className="rfq-card" key={rfq.id}>
                        {editingRfqId === rfq.id ? (
                          <form onSubmit={updateRfq}>
                            <h3>Edit RFQ</h3>

                            <label>
                              Product / Service Name

                              <input
                                type="text"
                                value={editProductName}
                                onChange={(event) =>
                                  setEditProductName(event.target.value)
                                }
                                required
                              />
                            </label>

                            <label>
                              Description

                              <textarea
                                value={editDescription}
                                onChange={(event) =>
                                  setEditDescription(event.target.value)
                                }
                                required
                              />
                            </label>

                            <label>
                              Quantity

                              <input
                                type="number"
                                min="1"
                                value={editQuantity}
                                onChange={(event) =>
                                  setEditQuantity(event.target.value)
                                }
                                required
                              />
                            </label>

                            <label>
                              Delivery Location

                              <input
                                type="text"
                                value={editDeliveryLocation}
                                onChange={(event) =>
                                  setEditDeliveryLocation(event.target.value)
                                }
                                required
                              />
                            </label>

                            <label>
                              Deadline

                              <input
                                type="datetime-local"
                                min={getMinDateTime()}
                                value={editDeadline}
                                onChange={(event) =>
                                  setEditDeadline(event.target.value)
                                }
                                required
                              />
                            </label>

                            <button
                              className="submit-button"
                              type="submit"
                              disabled={updatingRfq}
                            >
                              {updatingRfq ? "Saving..." : "Save Changes"}
                            </button>

                            <button
                              type="button"
                              onClick={cancelEditingRfq}
                              disabled={updatingRfq}
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <>
                            <h3>{rfq.productName}</h3>

                            <p>{rfq.description}</p>

                            <p>
                              <strong>Quantity:</strong> {rfq.quantity}
                            </p>

                            <p>
                              <strong>Location:</strong>{" "}
                              {rfq.deliveryLocation}
                            </p>

                            <p>
                              <strong>Deadline:</strong>{" "}
                              {new Date(rfq.deadline).toLocaleDateString()}
                            </p>

                            <div>
                              <button
                                className="submit-button"
                                type="button"
                                onClick={() => startEditingRfq(rfq)}
                              >
                                Edit RFQ
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteRfq(rfq.id)}
                                disabled={deletingRfqId === rfq.id}
                              >
                                {deletingRfqId === rfq.id
                                  ? "Deleting..."
                                  : "Delete RFQ"}
                              </button>

                              <button
                                className="submit-button"
                                type="button"
                                onClick={() => loadQuotations(rfq.id)}
                              >
                                View Quotations
                              </button>
                            </div>

                            {selectedQuotationRfqId === rfq.id && (
                              <div className="quotation-section">
                                {loadingQuotations ? (
                                  <p>Loading quotations...</p>
                                ) : quotations.length === 0 ? (
                                  <p>No quotations received yet.</p>
                                ) : (
                                  <div>
                                    <h4>Supplier Quotations</h4>

                                    {quotations.map((quotation) => (
                                      <div
                                        className="quotation-card"
                                        key={quotation.id}
                                      >
                                        <p>
                                          <strong>Supplier:</strong>{" "}
                                          {quotation.supplier?.name ||
                                            "Unknown"}
                                        </p>

                                        <p>
                                          <strong>Quoted Price:</strong>{" "}
                                          {quotation.quotedPrice}
                                        </p>

                                        <p>
                                          <strong>Delivery Time:</strong>{" "}
                                          {quotation.deliveryTime}
                                        </p>

                                        {quotation.message && (
                                          <p>
                                            <strong>Message:</strong>{" "}
                                            {quotation.message}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {message && <div className="message">{message}</div>}
              </div>
            </section>
          )}

          {/* =========================
              SUPPLIER DASHBOARD
          ========================= */}
          {user.role === "SUPPLIER" && (
            <section>
              <h2>Supplier Dashboard</h2>

              <div className="dashboard-card">
                <h3>Available RFQs</h3>

                {/* SEARCH AND FILTERS */}
                <div className="filter-section">
                  <label>
                    Search RFQs

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.target.value)
                      }
                      placeholder="Search product or description"
                    />
                  </label>

                  <label>
                    Location

                    <input
                      type="text"
                      value={locationFilter}
                      onChange={(event) =>
                        setLocationFilter(event.target.value)
                      }
                      placeholder="Example: Hyderabad"
                    />
                  </label>

                  <label>
                    Deadline on or before

                    <input
                      type="date"
                      value={deadlineFilter}
                      onChange={(event) =>
                        setDeadlineFilter(event.target.value)
                      }
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setLocationFilter("");
                      setDeadlineFilter("");
                    }}
                  >
                    Clear Filters
                  </button>
                </div>

                {loadingRfqs ? (
                  <p>Loading RFQs...</p>
                ) : rfqError ? (
                  <p>{rfqError}</p>
                ) : filteredRfqs.length === 0 ? (
                  <p>No RFQs match your search or filters.</p>
                ) : (
                  filteredRfqs.map((rfq) => (
                    <div className="rfq-card" key={rfq.id}>
                      <h3>{rfq.productName}</h3>

                      <p>{rfq.description}</p>

                      <p>
                        <strong>Quantity:</strong> {rfq.quantity}
                      </p>

                      <p>
                        <strong>Location:</strong>{" "}
                        {rfq.deliveryLocation}
                      </p>

                      <p>
                        <strong>Deadline:</strong>{" "}
                        {new Date(rfq.deadline).toLocaleDateString()}
                      </p>

                      {rfq.buyer && (
                        <p>
                          <strong>Buyer:</strong> {rfq.buyer.name}
                        </p>
                      )}

                      <button
                        className="submit-button"
                        type="button"
                        onClick={() => {
                          setSelectedRfqId(rfq.id);
                          setMessage("");
                          setRfqError("");
                        }}
                      >
                        Submit Quotation
                      </button>

                      {selectedRfqId === rfq.id && (
                        <form onSubmit={submitQuotation}>
                          <label>
                            Quoted Price

                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={quotedPrice}
                              onChange={(event) =>
                                setQuotedPrice(event.target.value)
                              }
                              placeholder="Example: 45000"
                              required
                            />
                          </label>

                          <label>
                            Estimated Delivery Time

                            <input
                              type="text"
                              value={deliveryTime}
                              onChange={(event) =>
                                setDeliveryTime(event.target.value)
                              }
                              placeholder="Example: 7 days"
                              required
                            />
                          </label>

                          <label>
                            Message / Notes

                            <textarea
                              value={quotationMessage}
                              onChange={(event) =>
                                setQuotationMessage(event.target.value)
                              }
                              placeholder="Add any additional information"
                            />
                          </label>

                          <button
                            className="submit-button"
                            type="submit"
                            disabled={submittingQuotation}
                          >
                            {submittingQuotation
                              ? "Submitting..."
                              : "Send Quotation"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRfqId(null);
                              setQuotedPrice("");
                              setDeliveryTime("");
                              setQuotationMessage("");
                            }}
                          >
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>
                  ))
                )}

                {message && <div className="message">{message}</div>}
              </div>

              {/* PREVIOUS SUBMISSIONS */}
              <div className="dashboard-card">
                <h3>Previous Submissions</h3>

                {loadingPreviousSubmissions ? (
                  <p>Loading previous submissions...</p>
                ) : previousSubmissionsError ? (
                  <p>{previousSubmissionsError}</p>
                ) : previousSubmissions.length === 0 ? (
                  <p>No previous submissions found.</p>
                ) : (
                  previousSubmissions.map((submission) => (
                    <div
                      className="quotation-card"
                      key={submission.id}
                    >
                      <h4>{submission.rfq.productName}</h4>

                      <p>
                        <strong>Quoted Price:</strong>{" "}
                        {submission.quotedPrice}
                      </p>

                      <p>
                        <strong>Delivery Time:</strong>{" "}
                        {submission.deliveryTime}
                      </p>

                      <p>
                        <strong>Quantity:</strong>{" "}
                        {submission.rfq.quantity}
                      </p>

                      <p>
                        <strong>Location:</strong>{" "}
                        {submission.rfq.deliveryLocation}
                      </p>

                      <p>
                        <strong>RFQ Deadline:</strong>{" "}
                        {new Date(
                          submission.rfq.deadline
                        ).toLocaleDateString()}
                      </p>

                      {submission.message && (
                        <p>
                          <strong>Message:</strong>{" "}
                          {submission.message}
                        </p>
                      )}

                      <p>
                        <strong>Submitted:</strong>{" "}
                        {new Date(
                          submission.createdAt
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  // LOGIN / SIGNUP
  return (
    <div className="app">
      <div className="card">
        <h1>B2B RFQ Marketplace</h1>

        <p className="subtitle">
          Connect buyers and suppliers through Request for Quotations.
        </p>

        <div className="tabs">
          <button
            className={isLogin ? "active" : ""}
            onClick={() => {
              setIsLogin(true);
              setMessage("");
            }}
          >
            Login
          </button>

          <button
            className={!isLogin ? "active" : ""}
            onClick={() => {
              setIsLogin(false);
              setMessage("");
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleAuth}>
          {!isLogin && (
            <label>
              Name

              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
          )}

          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {!isLogin && (
            <label>
              Account Type

              <select
                value={role}
                onChange={(event) =>
                  setRole(
                    event.target.value as "BUYER" | "SUPPLIER"
                  )
                }
              >
                <option value="BUYER">Buyer</option>
                <option value="SUPPLIER">Supplier</option>
              </select>
            </label>
          )}

          <button
            className="submit-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isLogin
                ? "Login"
                : "Create Account"}
          </button>
        </form>

        {message && <div className="message">{message}</div>}
      </div>
    </div>
  );
}

export default App;