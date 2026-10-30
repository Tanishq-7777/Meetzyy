import React, { useState } from "react";
import axios from "axios";
import { Check, Sparkles, Zap, Crown, ArrowRight, Star } from "lucide-react";
import { BASE_URL } from "../../constants";
import useAuthStore from "../store/useAuthStore";
import "./Payment.css";

const Payment = () => {
  const [loading, setLoading] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [selectedPlanName, setSelectedPlanName] = useState("");

  const user = useAuthStore((store) => store.user);
  const fetchUser = useAuthStore((state) => state.fetchUser);

  const plans = [
    {
      id: "Silver",
      rank: 1,
      price: 149,
      icon: <Zap size={22} />,
      color: "#6EE7C0",
      tokens: "3000 tokens",
      features: [
        "Real-time speech-to-text",
        "AI-generated key points",
        "Live meeting updates",
        "Access to past transcripts",
      ],
    },
    {
      id: "Gold",
      rank: 2,
      price: 299,
      popular: true,
      icon: <Sparkles size={22} />,
      color: "#F59E0B",
      tokens: "6000 tokens",
      features: [
        "Everything in Silver",
        "Priority AI Processing",
        "Extended context window",
        "Advanced insight tagging",
      ],
    },
    {
      id: "Platinum",
      rank: 3,
      price: 499,
      icon: <Crown size={22} />,
      color: "#38BDF8",
      tokens: "10000 tokens",
      features: [
        "Everything in Gold",
        "Unlimited cloud storage",
        "Team collaboration mode",
        "Custom AI summary styles",
      ],
    },
  ];

  // 1. Determine User Rank
  const userRankMap = { Free: 0, Silver: 1, Gold: 2, Platinum: 3 };
  const currentUserRank = userRankMap[user?.membershipType] || 0;

  // 2. Filter: Show only current plan and HIGHER plans
  const displayedPlans = plans.filter((plan) => plan.rank >= currentUserRank);

  const handlePayment = async (plan) => {
    try {
      setLoading(plan.id);
      setSelectedPlanName(plan.id);

      const { data } = await axios.post(
        `${BASE_URL}/api/payment/create`,
        { name: user.name, type: plan.id },
        { withCredentials: true },
      );

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Meetzyy",
        order_id: data.orderId,
        handler: async function (response) {
          setPaymentStatus("processing");
          setTimeout(async () => {
            await fetchUser(); // Refresh tokens and membershipType
            setPaymentStatus("success");
          }, 2500);
        },
        prefill: { name: user.name, email: user.email },
        theme: { color: plan.color },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="pm-page">
      {/* Overlay for processing/success */}
      {paymentStatus !== "idle" && (
        <div className="pm-modal-overlay">
          <div className="pm-modal-content">
            {paymentStatus === "processing" ? (
              <div className="pm-loader-section">
                <div className="pm-spinner" />
                <h3>Verifying Payment...</h3>
              </div>
            ) : (
              <div className="pm-success-section">
                <div className="pm-check-circle">
                  <Check size={40} color="white" />
                </div>
                <h2>Success!</h2>
                <p>
                  Welcome to the <strong>{user?.membershipType}</strong> Tier.
                </p>
                <button
                  className="pm-dashboard-btn"
                  onClick={() => (window.location.href = "/")}
                >
                  Enter Dashboard <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pm-grid-bg" />

      <header className="pm-header">
        <h1 className="pm-title">
          {currentUserRank > 0
            ? "Upgrade Your Power"
            : "Choose Your Intelligence"}
        </h1>
        <p className="pm-subtitle">
          {currentUserRank > 0
            ? `You are currently ${user?.membershipType}. Ready for more?`
            : "Unlock real-time insights and scale your team's productivity."}
        </p>
      </header>

      <div className="pm-plans-grid">
        {displayedPlans.map((plan) => {
          const isCurrentPlan = user?.membershipType === plan.id;

          return (
            <div
              key={plan.id}
              className={`pm-card ${plan.popular && !isCurrentPlan ? "pm-card-popular" : ""} ${isCurrentPlan ? "pm-card-active" : ""}`}
              style={{ "--plan-color": plan.color }}
            >
              {isCurrentPlan && (
                <div className="pm-active-badge">
                  <Star size={14} /> Current Plan
                </div>
              )}

              <div className="pm-card-header">
                <div
                  className="pm-icon-box"
                  style={{ background: `${plan.color}15`, color: plan.color }}
                >
                  {plan.icon}
                </div>
                <h2 className="pm-plan-name">{plan.id}</h2>
              </div>

              <div className="pm-price-section">
                <span className="pm-currency">₹</span>
                <span className="pm-amount">{plan.price}</span>
                <span className="pm-duration">/month</span>
              </div>

              <ul className="pm-features-list">
                <li className="pm-feature-item">
                  <Check
                    size={16}
                    className="pm-check-icon"
                    style={{ color: plan.color }}
                  />
                  <span style={{ fontWeight: "bold", color: "white" }}>
                    {plan.tokens}
                  </span>
                </li>
                {plan.features.map((f, i) => (
                  <li key={i} className="pm-feature-item">
                    <Check
                      size={16}
                      className="pm-check-icon"
                      style={{ color: plan.color }}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                className="pm-action-btn"
                onClick={() => !isCurrentPlan && handlePayment(plan)}
                disabled={loading === plan.id || isCurrentPlan}
                style={{
                  background: isCurrentPlan ? "transparent" : plan.color,
                  border: isCurrentPlan ? "1px solid #444" : "none",
                }}
              >
                {isCurrentPlan ? (
                  <span style={{ color: "#888" }}>Active Plan</span>
                ) : loading === plan.id ? (
                  "Processing..."
                ) : (
                  <>
                    Upgrade to {plan.id} <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Payment;
