import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Package, Search, Send } from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";
import sclsLogo from "@/assets/scls-logo.png";

type Shipment = {
  id: string;
  shipment_number: string;
  status: string;
  mode: string;
  origin: string | null;
  destination: string | null;
  eta: string | null;
  etd: string | null;
  carrier: string | null;
};

type TrackingEvent = {
  id: string;
  milestone: string;
  event_date: string;
  location: string | null;
  notes: string | null;
};

type Document = {
  id: string;
  file_name: string;
  document_type: string;
  file_url: string;
  created_at: string;
};

type Quotation = {
  id: string;
  quote_number: string;
  status: string;
  origin: string | null;
  destination: string | null;
  shipment_type: string | null;
  total_amount: number | null;
  currency: string;
  valid_until: string | null;
  created_at: string;
};

export default function CustomerPortal() {
  const [searchRef, setSearchRef] = useState("");
  const [searching, setSearching] = useState(false);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    origin: "",
    destination: "",
    shipment_type: "fcl",
    commodity: "",
    notes: "",
  });

  const handleSearch = async () => {
    if (!searchRef.trim()) {
      toast.error("Please enter a shipment number");
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .ilike("shipment_number", `%${searchRef}%`);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("No shipments found");
        setShipments([]);
        setSelectedShipment(null);
        setSearching(false);
        return;
      }

      setShipments(data);
      if (data.length === 1) {
        await loadShipmentDetails(data[0]);
      }
      toast.success(`Found ${data.length} shipment(s)`);
    } catch (error: any) {
      toast.error(error.message);
    }
    setSearching(false);
  };

  const loadShipmentDetails = async (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setCustomerId(shipment.id);

    const [events, docs, quotes] = await Promise.all([
      supabase
        .from("tracking_events")
        .select("*")
        .eq("shipment_id", shipment.id)
        .order("event_date", { ascending: false }),
      supabase
        .from("documents")
        .select("*")
        .eq("shipment_id", shipment.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("quotations")
        .select("*")
        .eq("customer_id", shipment.id)
        .order("created_at", { ascending: false }),
    ]);

    setTrackingEvents(events.data || []);
    setDocuments(docs.data || []);
    setQuotations(quotes.data || []);
  };

  const handleQuoteRequest = async () => {
    if (!quoteForm.origin || !quoteForm.destination) {
      toast.error("Origin and destination are required");
      return;
    }

    try {
      const { error } = await supabase.from("tasks").insert({
        description: `Quote request: ${quoteForm.shipment_type.toUpperCase()} from ${quoteForm.origin} to ${quoteForm.destination}. Commodity: ${quoteForm.commodity || "N/A"}. Notes: ${quoteForm.notes || "None"}`,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Quote request submitted successfully");
      setQuoteForm({ origin: "", destination: "", shipment_type: "fcl", commodity: "", notes: "" });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const downloadQuote = (quote: Quotation) => {
    const content = `
QUOTATION: ${quote.quote_number}
Status: ${quote.status}
Created: ${new Date(quote.created_at).toLocaleDateString()}
Valid Until: ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : "N/A"}

Route: ${quote.origin || "N/A"} → ${quote.destination || "N/A"}
Shipment Type: ${quote.shipment_type || "N/A"}
Total Amount: ${quote.currency} ${quote.total_amount?.toFixed(2) || "0.00"}
    `;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quote.quote_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <img src={sclsLogo} alt="SCLS Logo" className="h-16 w-16 mx-auto rounded-xl object-contain" />
          <h1 className="font-display text-4xl font-bold tracking-tight">SCLS Customer Portal</h1>
          <p className="text-muted-foreground">Track your shipments and manage your logistics across Saudi Arabia, GCC & beyond</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Shipment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="search">Shipment Number</Label>
                <Input
                  id="search"
                  placeholder="Enter shipment number (e.g., SHP-00001)"
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>

            {shipments.length > 1 && (
              <div className="space-y-2">
                <Label>Select Shipment</Label>
                {shipments.map((s) => (
                  <Card
                    key={s.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => loadShipmentDetails(s)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{s.shipment_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {s.origin} → {s.destination}
                        </p>
                      </div>
                      <StatusBadge status={s.status} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedShipment && (
          <Tabs defaultValue="tracking" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="tracking">Track Shipment</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="quotes">Quotes</TabsTrigger>
              <TabsTrigger value="request">Request Quote</TabsTrigger>
            </TabsList>

            <TabsContent value="tracking" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Shipment Details - {selectedShipment.shipment_number}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <StatusBadge status={selectedShipment.status} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mode</p>
                      <p className="font-medium">{selectedShipment.mode.toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Origin</p>
                      <p className="font-medium">{selectedShipment.origin || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Destination</p>
                      <p className="font-medium">{selectedShipment.destination || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ETD</p>
                      <p className="font-medium">
                        {selectedShipment.etd ? new Date(selectedShipment.etd).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ETA</p>
                      <p className="font-medium">
                        {selectedShipment.eta ? new Date(selectedShipment.eta).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Carrier</p>
                      <p className="font-medium">{selectedShipment.carrier || "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tracking Events</CardTitle>
                </CardHeader>
                <CardContent>
                  {trackingEvents.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No tracking events yet</p>
                  ) : (
                    <div className="space-y-4">
                      {trackingEvents.map((event) => (
                        <div key={event.id} className="flex gap-4 pb-4 border-b last:border-0">
                          <div className="flex-shrink-0 w-3 h-3 rounded-full bg-primary mt-1" />
                          <div className="flex-1">
                            <p className="font-semibold">{event.milestone.replace(/_/g, " ")}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(event.event_date).toLocaleString()}
                            </p>
                            {event.location && (
                              <p className="text-sm mt-1">
                                <Badge variant="outline">{event.location}</Badge>
                              </p>
                            )}
                            {event.notes && <p className="text-sm mt-2">{event.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Shipment Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No documents available</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.file_name}</TableCell>
                            <TableCell>
                              <StatusBadge status={doc.document_type.replace(/_/g, " ")} />
                            </TableCell>
                            <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" asChild>
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quotes">
              <Card>
                <CardHeader>
                  <CardTitle>Your Quotations</CardTitle>
                </CardHeader>
                <CardContent>
                  {quotations.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No quotations available</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quote #</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Valid Until</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotations.map((quote) => (
                          <TableRow key={quote.id}>
                            <TableCell className="font-medium">{quote.quote_number}</TableCell>
                            <TableCell>
                              {quote.origin || "—"} → {quote.destination || "—"}
                            </TableCell>
                            <TableCell>{quote.shipment_type?.toUpperCase() || "—"}</TableCell>
                            <TableCell>
                              {quote.currency} {quote.total_amount?.toFixed(2) || "0.00"}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={quote.status} />
                            </TableCell>
                            <TableCell>
                              {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => downloadQuote(quote)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="request">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Request a Quote
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="origin">Origin *</Label>
                      <Input
                        id="origin"
                        placeholder="e.g., Shanghai, China"
                        value={quoteForm.origin}
                        onChange={(e) => setQuoteForm({ ...quoteForm, origin: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="destination">Destination *</Label>
                      <Input
                        id="destination"
                        placeholder="e.g., Jeddah, Saudi Arabia"
                        value={quoteForm.destination}
                        onChange={(e) => setQuoteForm({ ...quoteForm, destination: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="shipment_type">Shipment Type</Label>
                      <Select
                        value={quoteForm.shipment_type}
                        onValueChange={(v) => setQuoteForm({ ...quoteForm, shipment_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fcl">FCL</SelectItem>
                          <SelectItem value="lcl">LCL</SelectItem>
                          <SelectItem value="air">Air</SelectItem>
                          <SelectItem value="land">Land</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="commodity">Commodity</Label>
                      <Input
                        id="commodity"
                        placeholder="e.g., Electronics"
                        value={quoteForm.commodity}
                        onChange={(e) => setQuoteForm({ ...quoteForm, commodity: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special requirements or details..."
                      value={quoteForm.notes}
                      onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleQuoteRequest} className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Submit Quote Request
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
