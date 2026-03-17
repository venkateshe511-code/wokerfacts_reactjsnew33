import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Edit,
  Check,
  CreditCard,
  Lock,
  Shield,
  DollarSign,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PaymentData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  amount: number;
  currency: string;
}

export default function Payment() {
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState<PaymentData>({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
    billingAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "US",
    },
    amount: 25.0, // Sample evaluation report price
    currency: "USD",
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTestMode, setShowTestMode] = useState(true);

  useEffect(() => {
    // Check if we have existing payment data (edit mode)
    const existingData = localStorage.getItem("paymentData");
    if (existingData) {
      const savedData = JSON.parse(existingData);
      setPaymentData(savedData);
      setIsEditMode(true);
    }
  }, []);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setPaymentData((prev) => ({ ...prev, cardNumber: formatted }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    setPaymentData((prev) => ({ ...prev, expiryDate: formatted }));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "").substring(0, 4);
    setPaymentData((prev) => ({ ...prev, cvv: value }));
  };

  const fillTestCard = () => {
    setPaymentData((prev) => ({
      ...prev,
      cardNumber: "4242 4242 4242 4242", // Stripe test card
      expiryDate: "12/25",
      cvv: "123",
      cardholderName: "Test User",
      billingAddress: {
        street: "123 Test Street",
        city: "Test City",
        state: "CA",
        zipCode: "12345",
        country: "US",
      },
    }));
  };

  const handleSubmit = async () => {
    setIsProcessing(true);

    // Simulate Stripe payment processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Simulate successful payment
    const paymentResult = {
      success: true,
      transactionId: `txn_${Date.now()}`,
      amount: paymentData.amount,
      currency: paymentData.currency,
      timestamp: new Date().toISOString(),
    };

    // Store payment data (without sensitive card info)
    const dataToStore = {
      ...paymentData,
      cardNumber: "**** **** **** " + paymentData.cardNumber.slice(-4),
      cvv: "***",
      paymentResult,
    };
    localStorage.setItem("paymentData", JSON.stringify(dataToStore));

    // Mark step 8 as completed
    const completedSteps = JSON.parse(
      localStorage.getItem("completedSteps") || "[]",
    );
    if (!completedSteps.includes(8)) {
      completedSteps.push(8);
      localStorage.setItem("completedSteps", JSON.stringify(completedSteps));
    }

    // Set Stripe payment success flag to persist payment state across page reloads
    localStorage.setItem("stripePaymentSuccess", "1");

    setIsProcessing(false);
    setShowSuccessDialog(true);
  };

  const isFormValid = () => {
    return (
      paymentData.cardNumber.replace(/\s/g, "").length >= 16 &&
      paymentData.expiryDate.length === 5 &&
      paymentData.cvv.length >= 3 &&
      paymentData.cardholderName.trim().length > 0 &&
      paymentData.billingAddress.street.trim().length > 0 &&
      paymentData.billingAddress.city.trim().length > 0 &&
      paymentData.billingAddress.zipCode.trim().length > 0
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center">
              {isEditMode && <Edit className="mr-3 h-8 w-8 text-orange-600" />}
              Payment
              {isEditMode && (
                <span className="ml-3 text-2xl text-orange-600">
                  (Edit Mode)
                </span>
              )}
            </h1>
            <p className="text-xl text-gray-600">
              {isEditMode
                ? "Update payment information"
                : "Process payment for your evaluation report"}
            </p>
          </div>
        </div>

        {/* Test Mode Banner */}
        {showTestMode && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              <span className="font-medium">
                TEST MODE - No real charges will be made
              </span>
            </div>
            <button
              onClick={() => setShowTestMode(false)}
              className="text-yellow-600 hover:text-yellow-800"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment Form - 2 columns */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader
                className={`text-white ${isEditMode ? "bg-orange-600" : "bg-blue-600"}`}
              >
                <CardTitle className="text-2xl flex items-center">
                  {isEditMode ? (
                    <>
                      <Edit className="mr-3 h-6 w-6" />
                      Step 8: Edit Payment Information
                    </>
                  ) : (
                    <>
                      <div className="w-6 h-6 mr-3 bg-white text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                        8
                      </div>
                      Step 8: Pay for Evaluation Report
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {/* Test Card Helper */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-blue-900">
                        Test Payment
                      </h3>
                      <p className="text-sm text-blue-700">
                        Use test card for demo purposes
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fillTestCard}
                      className="bg-blue-100 text-blue-600 hover:bg-blue-200"
                    >
                      Fill Test Card
                    </Button>
                  </div>
                </div>

                <form className="space-y-6">
                  {/* Card Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <CreditCard className="mr-2 h-5 w-5" />
                      Card Information
                    </h3>

                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        type="text"
                        value={paymentData.cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4242 4242 4242 4242"
                        maxLength={19}
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          type="text"
                          value={paymentData.expiryDate}
                          onChange={handleExpiryChange}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          type="text"
                          value={paymentData.cvv}
                          onChange={handleCvvChange}
                          placeholder="123"
                          maxLength={4}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cardholderName">Cardholder Name</Label>
                      <Input
                        id="cardholderName"
                        type="text"
                        value={paymentData.cardholderName}
                        onChange={(e) =>
                          setPaymentData((prev) => ({
                            ...prev,
                            cardholderName: e.target.value,
                          }))
                        }
                        placeholder="John Doe"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Billing Address
                    </h3>

                    <div>
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        type="text"
                        value={paymentData.billingAddress.street}
                        onChange={(e) =>
                          setPaymentData((prev) => ({
                            ...prev,
                            billingAddress: {
                              ...prev.billingAddress,
                              street: e.target.value,
                            },
                          }))
                        }
                        placeholder="123 Main Street"
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          type="text"
                          value={paymentData.billingAddress.city}
                          onChange={(e) =>
                            setPaymentData((prev) => ({
                              ...prev,
                              billingAddress: {
                                ...prev.billingAddress,
                                city: e.target.value,
                              },
                            }))
                          }
                          placeholder="New York"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          type="text"
                          value={paymentData.billingAddress.state}
                          onChange={(e) =>
                            setPaymentData((prev) => ({
                              ...prev,
                              billingAddress: {
                                ...prev.billingAddress,
                                state: e.target.value,
                              },
                            }))
                          }
                          placeholder="NY"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="zipCode">ZIP Code</Label>
                        <Input
                          id="zipCode"
                          type="text"
                          value={paymentData.billingAddress.zipCode}
                          onChange={(e) =>
                            setPaymentData((prev) => ({
                              ...prev,
                              billingAddress: {
                                ...prev.billingAddress,
                                zipCode: e.target.value,
                              },
                            }))
                          }
                          placeholder="10001"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="country">Country</Label>
                        <select
                          id="country"
                          value={paymentData.billingAddress.country}
                          onChange={(e) =>
                            setPaymentData((prev) => ({
                              ...prev,
                              billingAddress: {
                                ...prev.billingAddress,
                                country: e.target.value,
                              },
                            }))
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="US">United States</option>
                          <option value="CA">Canada</option>
                          <option value="GB">United Kingdom</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary - 1 column */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg sticky top-8">
              <CardHeader className="bg-green-600 text-white">
                <CardTitle className="text-lg flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Evaluation Report</span>
                    <span className="font-medium">${paymentData.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing Fee</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-green-600">
                      ${paymentData.amount} {paymentData.currency}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    onClick={handleSubmit}
                    disabled={!isFormValid() || isProcessing}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                  >
                    {isProcessing ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing Payment...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Lock className="mr-2 h-5 w-5" />
                        Pay ${paymentData.amount}
                      </div>
                    )}
                  </Button>
                </div>

                <div className="mt-4 text-xs text-gray-500 text-center">
                  <div className="flex items-center justify-center">
                    <Shield className="h-3 w-3 mr-1" />
                    Secured by Stripe (Test Mode)
                  </div>
                  <p className="mt-1">
                    Your payment information is encrypted and secure
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl text-green-600">
                <Check className="mr-3 h-6 w-6" />
                Payment Successful!
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Payment Processed Successfully
                </h3>
                <p className="text-gray-600">
                  Your payment of ${paymentData.amount} has been processed. You
                  can now download your evaluation report.
                </p>
                <p className="text-sm text-gray-500">
                  Transaction ID: txn_{Date.now()}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowSuccessDialog(false)}
                className="flex-1"
              >
                Stay Here
              </Button>
              <Button
                onClick={() => navigate("/dashboard")}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Return to Dashboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
